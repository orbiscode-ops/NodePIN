const express = require('express');
const Docker = require('dockerode');
const path = require('path');
const { collectMetrics } = require('./providers');
const auth = require('./auth');

const app = express();
// Allow tests to inject a mock Docker client via global.__DOCKER_MOCK__.
const docker = global.__DOCKER_MOCK__ || new Docker({ socketPath: '/var/run/docker.sock' });

// Only surface containers that belong to NodePIN (never other projects).
const NODEPIN_LABEL = 'com.nodepin.project';

const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────
app.use(express.json());

app.post('/api/login', (req, res) => {
  if (!auth.authEnabled()) return res.json({ ok: true, authDisabled: true });
  const { password } = req.body || {};
  if (auth.checkPassword(password)) {
    auth.setSessionCookie(res);
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

app.post('/api/logout', (_req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/login.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ── Endpoints ───────────────────────────────

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Everything below requires auth (if DASHBOARD_PASSWORD is set).
app.use(auth.requireAuth);
app.use(express.static(path.join(__dirname, 'public')));



// List NodePIN containers only (filtered by label — ignores other projects)
app.get('/api/containers', async (_req, res) => {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: [`${NODEPIN_LABEL}=nodepin`] },
    });
    const formatted = containers.map(c => ({
      id: c.Id.slice(0, 12),
      name: c.Names[0]?.replace('/', ''),
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: c.Ports.map(p => `${p.PublicPort}:${p.PrivatePort}`).join(', ')
    }));
    res.json({ count: formatted.length, containers: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Container details by name
app.get('/api/containers/:name', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name);
    const info = await container.inspect();
    res.json({
      name: info.Name.replace('/', ''),
      state: info.State.Status,
      health: info.State.Health?.Status || 'N/A',
      startedAt: info.State.StartedAt,
      image: info.Config.Image,
      env: info.Config.Env.filter(e => !e.includes('PASS') && !e.includes('KEY') && !e.includes('SECRET'))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real earnings & metrics — aggregated from enabled providers.
app.get('/api/metrics', async (_req, res) => {
  try {
    const data = await collectMetrics();
    res.json({ ...data, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Mysterium API Password in the host's .env file directly from UI
app.post('/api/mysterium/password', async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Password required' });

  const fs = require('fs');
  const path = require('path');
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
    // Update current process env as well
    process.env.MYST_API_PASSWORD = password;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deploy a new Sentinel node container dynamically on the VPS using manage-nodes.sh
app.post('/api/nodes', (req, res) => {
  const { moniker, ip, type, mode, mnemonic } = req.body || {};
  if (!type || !ip) {
    return res.status(400).json({ error: 'Type and IP are required' });
  }

  const { exec } = require('child_process');
  
  // Clean inputs to prevent command injection
  const cleanMoniker = (moniker || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanIp = (ip || '').replace(/[^0-9.]/g, '');
  const cleanType = (type || '').replace(/[^a-zA-Z0-9]/g, '');
  const cleanMode = (mode || 'auto').replace(/[^a-z]/g, '');
  // Mnemonic can contain letters, numbers, and spaces
  const cleanMnemonic = (mnemonic || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();

  const monikerArg = cleanMoniker ? `'${cleanMoniker}'` : "''";
  const ipArg = cleanIp ? `'${cleanIp}'` : "''";
  const typeArg = cleanType ? `'${cleanType}'` : "''";
  const modeArg = cleanMode ? `'${cleanMode}'` : "''";
  const mnemonicArg = cleanMnemonic ? `'${cleanMnemonic}'` : "''";

  // Invoke manage-nodes.sh inside the container
  const cmd = `bash /app/manage-nodes.sh add ${monikerArg} ${ipArg} ${typeArg} ${modeArg} ${mnemonicArg}`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`[NodePIN Engine Error]: ${stderr || error.message}`);
      return res.status(500).json({ error: error.message, details: stderr || stdout });
    }

    // Try reading key_info.json if it exists to retrieve mnemonic & address
    const fs = require('fs');
    const path = require('path');
    let wallet = null;

    if (cleanMoniker) {
      try {
        const keyPath = path.join('/app/data', `sentinel_${cleanMoniker}`, 'key_info.json');
        if (fs.existsSync(keyPath)) {
          wallet = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        }
      } catch (e) {
        console.error(`[NodePIN Wallet Read Error]: ${e.message}`);
      }
    }

    res.json({ ok: true, output: stdout, wallet });
  });
});

// Remove a Sentinel node container dynamically on the VPS using manage-nodes.sh
app.delete('/api/nodes/:moniker', (req, res) => {
  const moniker = req.params.moniker;
  const cleanMoniker = (moniker || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanMoniker) {
    return res.status(400).json({ error: 'Moniker is required' });
  }

  const { exec } = require('child_process');
  const cmd = `bash /app/manage-nodes.sh remove '${cleanMoniker}'`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`[NodePIN Engine Remove Error]: ${stderr || error.message}`);
      return res.status(500).json({ error: error.message, details: stderr || stdout });
    }
    res.json({ ok: true, output: stdout });
  });
});




// Start server only when run directly (not when imported by tests).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[NodePIN] Control Panel running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
