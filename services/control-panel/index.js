const express = require('express');
const Docker = require('dockerode');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Load static assets
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.DASHBOARD_PORT || 3000;

// Initialize local Docker client (for fallback / local execution)
const docker = global.__DOCKER_MOCK__ || new Docker();

// Helper to extract SSH Configuration from request headers
function getSSHConfig(req) {
  const host = req.headers['x-ssh-host'];
  if (!host) return null;

  const port = req.headers['x-ssh-port'] || '22';
  const username = req.headers['x-ssh-user'] || 'root';
  let key = req.headers['x-ssh-key'] || '';

  if (key) {
    try {
      key = Buffer.from(key, 'base64').toString('utf8');
    } catch (e) {
      // fallback if decoding fails
    }
  }

  return { host, port, username, key };
}

// Helper to execute a command on a remote server over SSH
function executeSSHCommand(sshConfig, cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code, signal) => {
          conn.end();
          resolve({ code, stdout, stderr });
        }).on('data', (data) => {
          stdout += data.toString();
        }).stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    }).on('error', (err) => {
      reject(err);
    });

    // Detect if key is a private key or password
    const isPrivateKey = sshConfig.key && (sshConfig.key.includes('-----BEGIN') || sshConfig.key.includes('KEY-----'));
    const connConfig = {
      host: sshConfig.host,
      port: parseInt(sshConfig.port) || 22,
      username: sshConfig.username || 'root',
      readyTimeout: 10000
    };

    if (isPrivateKey) {
      connConfig.privateKey = sshConfig.key;
    } else {
      connConfig.password = sshConfig.key;
    }

    conn.connect(connConfig);
  });
}

// ── API Authentication Middleware (Optional) ──
function requireAuth(req, res, next) {
  const password = process.env.DASHBOARD_API_KEY;
  if (!password) return next(); // disabled if no key set

  const session = req.headers['x-session'];
  const apiKey = req.headers['x-api-key'];

  if (apiKey === password || session === 'authenticated') {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized' });
}

// Apply auth to all API routes
app.use('/api', requireAuth);

// ── 1. Health Endpoint ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', authRequired: !!process.env.DASHBOARD_API_KEY });
});

// ── 2. Containers Endpoint ──
app.get('/api/containers', async (req, res) => {
  const sshConfig = getSSHConfig(req);

  if (sshConfig) {
    // SSH Mode: Query target VPS using docker ps command
    try {
      const cmd = `docker ps -a --format '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","state":"{{.State}}","status":"{{.Status}}","ports":"{{.Ports}}"}' --filter "name=nodepin_"`;
      const result = await executeSSHCommand(sshConfig, cmd);
      
      const lines = result.stdout.trim().split('\n').filter(Boolean);
      const containers = lines.map(line => {
        try {
          const item = JSON.parse(line);
          // strip leading slash from name
          const name = item.name.startsWith('/') ? item.name.slice(1) : item.name;
          return { id: item.id, name, image: item.image, state: item.state, status: item.status, ports: item.ports };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      return res.json({ count: containers.length, containers });
    } catch (err) {
      return res.status(500).json({ error: `SSH Connection to ${sshConfig.host} failed: ${err.message}` });
    }
  }

  // Local/Fallback Mode: Use Dockerode
  try {
    const list = await docker.listContainers({ all: true });
    const containers = list
      .filter(c => c.Names.some(n => n.includes('nodepin_')))
      .map(c => {
        const name = c.Names[0].startsWith('/') ? c.Names[0].slice(1) : c.Names[0];
        const ports = c.Ports.map(p => `${p.PublicPort || p.PrivatePort}`).join(', ');
        return {
          id: c.Id.slice(0, 12),
          name,
          image: c.Image,
          state: c.State,
          status: c.Status,
          ports
        };
      });
    res.json({ count: containers.length, containers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3. Metrics Endpoint ──
app.get('/api/metrics', async (req, res) => {
  const sshConfig = getSSHConfig(req);
  const enabledStr = process.env.ENABLED_NETWORKS || 'mysterium';
  const networks = enabledStr.split(',').map(s => s.trim()).filter(Boolean);

  const response = {
    timestamp: new Date().toISOString(),
    nodes: {}
  };

  if (sshConfig) {
    // SSH Mode: Query metrics from services on target VPS
    for (const net of networks) {
      if (net === 'mysterium') {
        try {
          // Query local Mysterium port inside the remote VPS
          const cmd = `curl -s --connect-timeout 2 http://localhost:4050/api/v1/connection/status || echo ""`;
          const result = await executeSSHCommand(sshConfig, cmd);
          
          if (result.stdout.trim()) {
            const data = JSON.parse(result.stdout);
            response.nodes['mysterium'] = {
              status: data.status === 'connected' ? 'running' : 'stopped',
              token: 'MYST',
              extra: {
                identity: data.identity || 'N/A',
                peers: data.peers_count || 0,
                transferred: data.bytes_sent + data.bytes_received,
                balance: 'N/A',
                version: 'N/A'
              }
            };
          } else {
            response.nodes['mysterium'] = { status: 'stopped', token: 'MYST', extra: { error: 'Service unreachable' } };
          }
        } catch (e) {
          response.nodes['mysterium'] = { status: 'error', token: 'MYST', extra: { error: e.message } };
        }
      }
    }
    return res.json(response);
  }

  // Local/Fallback Mode
  for (const net of networks) {
    if (net === 'mysterium') {
      const http = require('http');
      const getStatus = () => new Promise((resolve) => {
        const reqOpts = { host: '127.0.0.1', port: 4050, path: '/api/v1/connection/status', timeout: 1000 };
        http.get(reqOpts, (apiRes) => {
          let body = '';
          apiRes.on('data', (c) => body += c);
          apiRes.on('end', () => {
            try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
          });
        }).on('error', () => resolve(null));
      });
      const data = await getStatus();
      if (data) {
        response.nodes['mysterium'] = {
          status: data.status === 'connected' ? 'running' : 'stopped',
          token: 'MYST',
          extra: {
            identity: data.identity,
            peers: data.peers_count,
            transferred: data.bytes_sent + data.bytes_received
          }
        };
      } else {
        response.nodes['mysterium'] = { status: 'stopped', token: 'MYST', extra: { message: 'Mysterium API disconnected' } };
      }
    }
  }

  res.json(response);
});

// ── 4. Deploy Node Endpoint ──
app.post('/api/nodes', async (req, res) => {
  const { moniker, ip, type, mode, mnemonic } = req.body || {};
  if (!type || !ip) {
    return res.status(400).json({ error: 'Type and IP are required' });
  }

  const sshConfig = getSSHConfig(req);

  // Read local script and encode in base64 to bootstrap target VPS
  let scriptContent = '';
  try {
    scriptContent = fs.readFileSync(path.resolve(__dirname, '../../manage-nodes.sh'), 'utf8');
  } catch (err) {
    return res.status(500).json({ error: `Failed to load manage-nodes.sh on master: ${err.message}` });
  }
  const scriptBase64 = Buffer.from(scriptContent).toString('base64');

  const cleanMoniker = (moniker || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanIp = (ip || '').replace(/[^0-9.]/g, '');
  const cleanType = (type || '').replace(/[^a-zA-Z0-9]/g, '');
  const cleanMode = (mode || 'auto').replace(/[^a-z]/g, '');
  const cleanMnemonic = (mnemonic || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();

  const monikerArg = cleanMoniker ? `'${cleanMoniker}'` : "''";
  const ipArg = cleanIp ? `'${cleanIp}'` : "''";
  const typeArg = cleanType ? `'${cleanType}'` : "''";
  const modeArg = cleanMode ? `'${cleanMode}'` : "''";
  const mnemonicArg = cleanMnemonic ? `'${cleanMnemonic}'` : "''";

  if (sshConfig) {
    // SSH Mode: Bootstrap manage-nodes.sh and execute remotely
    try {
      // 1. Write the script to /tmp/manage-nodes.sh
      const prepareCmd = `mkdir -p /root/data && echo "${scriptBase64}" | base64 -d > /tmp/manage-nodes.sh && chmod +x /tmp/manage-nodes.sh`;
      await executeSSHCommand(sshConfig, prepareCmd);

      // 2. Execute the add node command
      const runCmd = `bash /tmp/manage-nodes.sh add ${monikerArg} ${ipArg} ${typeArg} ${modeArg} ${mnemonicArg}`;
      const runResult = await executeSSHCommand(sshConfig, runCmd);

      if (runResult.code !== 0) {
        return res.status(500).json({ error: `Script execution failed (code ${runResult.code})`, details: runResult.stderr || runResult.stdout });
      }

      // 3. Read key_info.json if it exists on the target VPS
      let wallet = null;
      if (cleanMoniker) {
        const readKeyCmd = `cat /root/data/sentinel_${cleanMoniker}/key_info.json 2>/dev/null || echo ""`;
        const keyResult = await executeSSHCommand(sshConfig, readKeyCmd);
        if (keyResult.stdout.trim()) {
          try {
            wallet = JSON.parse(keyResult.stdout);
          } catch (e) {
            // failed parsing
          }
        }
      }

      return res.json({ ok: true, output: runResult.stdout, wallet });
    } catch (err) {
      return res.status(500).json({ error: `SSH execution to ${sshConfig.host} failed: ${err.message}` });
    }
  }

  // Local/Fallback Mode (Using local exec)
  const { exec } = require('child_process');
  const cmd = `bash /app/manage-nodes.sh add ${monikerArg} ${ipArg} ${typeArg} ${modeArg} ${mnemonicArg}`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message, details: stderr || stdout });
    }
    let wallet = null;
    if (cleanMoniker) {
      try {
        const keyPath = path.join('/app/data', `sentinel_${cleanMoniker}`, 'key_info.json');
        if (fs.existsSync(keyPath)) {
          wallet = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        }
      } catch (e) {
        // ignore wallet parsing error
      }
    }
    res.json({ ok: true, output: stdout, wallet });
  });
});

// ── 5. Remove Node Endpoint ──
app.delete('/api/nodes/:moniker', async (req, res) => {
  const moniker = req.params.moniker;
  const cleanMoniker = (moniker || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanMoniker) {
    return res.status(400).json({ error: 'Moniker is required' });
  }

  const sshConfig = getSSHConfig(req);

  // Read local script and encode in base64 to bootstrap target VPS
  let scriptContent = '';
  try {
    scriptContent = fs.readFileSync(path.resolve(__dirname, '../../manage-nodes.sh'), 'utf8');
  } catch (err) {
    return res.status(500).json({ error: `Failed to load manage-nodes.sh on master: ${err.message}` });
  }
  const scriptBase64 = Buffer.from(scriptContent).toString('base64');

  if (sshConfig) {
    // SSH Mode: Bootstrap manage-nodes.sh and execute remotely
    try {
      const prepareCmd = `echo "${scriptBase64}" | base64 -d > /tmp/manage-nodes.sh && chmod +x /tmp/manage-nodes.sh`;
      await executeSSHCommand(sshConfig, prepareCmd);

      const runCmd = `bash /tmp/manage-nodes.sh remove '${cleanMoniker}'`;
      const runResult = await executeSSHCommand(sshConfig, runCmd);

      if (runResult.code !== 0) {
        return res.status(500).json({ error: `Script execution failed (code ${runResult.code})`, details: runResult.stderr || runResult.stdout });
      }

      return res.json({ ok: true, output: runResult.stdout });
    } catch (err) {
      return res.status(500).json({ error: `SSH execution to ${sshConfig.host} failed: ${err.message}` });
    }
  }

  // Local/Fallback Mode
  const { exec } = require('child_process');
  const cmd = `bash /app/manage-nodes.sh remove '${cleanMoniker}'`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message, details: stderr || stdout });
    }
    res.json({ ok: true, output: stdout });
  });
});

// ── 6. Mysterium Password Endpoint ──
app.post('/api/mysterium/password', async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Password required' });

  const envPath = path.resolve(__dirname, '../../.env');

  try {
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('MYST_API_PASSWORD=')) {
        content = content.replace(/^MYST_API_PASSWORD=.*/m, `MYST_API_PASSWORD=${password}`);
      } else {
        content += `\nMYST_API_PASSWORD=${password}`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
    }
    process.env.MYST_API_PASSWORD = password;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server only when run directly (not when imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[NodePIN] Control Panel running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
