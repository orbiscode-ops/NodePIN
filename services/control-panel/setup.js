// ═══════════════════════════════════════════
// NodePIN — Setup Wizard backend (open / free-form)
// Stores any network the user defines: name + Docker image + env vars
// Config saved to /app/data/nodepin-networks.json (persistent volume)
// ═══════════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DATA_DIR    = process.env.DATA_DIR || '/app/data';
const NETS_FILE   = path.join(DATA_DIR, 'nodepin-networks.json');
const COMPOSE_DIR = process.env.COMPOSE_DIR || '/nodepin';

// ── Helpers ───────────────────────────────────────────
function readNetworks() {
  try {
    if (!fs.existsSync(NETS_FILE)) return [];
    return JSON.parse(fs.readFileSync(NETS_FILE, 'utf8'));
  } catch { return []; }
}

function writeNetworks(networks) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(NETS_FILE, JSON.stringify(networks, null, 2), { mode: 0o600 });
}

// Mask secrets for API responses
const MASK_KEYS = ['PASS', 'KEY', 'SECRET', 'TOKEN', 'WALLET', 'PASSPHRASE'];
function maskNets(networks) {
  return networks.map(n => ({
    ...n,
    vars: (n.vars || []).map(v => ({
      k: v.k,
      v: MASK_KEYS.some(m => v.k.toUpperCase().includes(m)) ? '••••••••' : v.v,
    })),
  }));
}

// Run docker compose command
function compose(args) {
  return new Promise((resolve, reject) => {
    execFile('docker', ['compose', ...args], { cwd: COMPOSE_DIR }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout);
    });
  });
}

// Run docker command directly
function docker(args) {
  return new Promise((resolve, reject) => {
    execFile('docker', args, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout);
    });
  });
}

// Build a minimal docker-compose service definition for a custom network
function buildServiceYaml(net) {
  const name = net.name.replace(/[^a-z0-9_-]/gi, '');
  const envLines = (net.vars || [])
    .filter(v => v.k && v.v)
    .map(v => `      - ${v.k}=${v.v}`)
    .join('\n');

  return `
services:
  ${name}:
    image: ${net.image}
    container_name: nodepin_${name}
    restart: unless-stopped
    networks:
      - nodepin-net
    labels:
      com.nodepin.project: "nodepin"
      com.nodepin.network: "${name}"
${envLines ? `    environment:\n${envLines}` : ''}
networks:
  nodepin-net:
    external: true
    name: nodepin-net
`.trim();
}

// Write per-network compose file to /app/data/compose-{name}.yml
function writeNetworkCompose(net) {
  const yaml = buildServiceYaml(net);
  const file = path.join(DATA_DIR, `compose-${net.name}.yml`);
  fs.writeFileSync(file, yaml, { mode: 0o600 });
  return file;
}

// Run docker compose for a specific network compose file
function composeFile(file, args) {
  return new Promise((resolve, reject) => {
    execFile('docker', ['compose', '-f', file, ...args], (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout);
    });
  });
}

// ── Routes ────────────────────────────────────────────
function registerSetupRoutes(app, requireAuth) {

  // GET /api/setup/custom — load saved networks (secrets masked)
  app.get('/api/setup/custom', requireAuth, (_req, res) => {
    const nets = readNetworks();
    res.json({ networks: maskNets(nets) });
  });

  // POST /api/setup/custom — save all networks
  app.post('/api/setup/custom', requireAuth, (req, res) => {
    const { networks } = req.body || {};
    if (!Array.isArray(networks)) return res.status(400).json({ error: 'invalid payload' });

    // Merge: keep real secret values from disk if masked in payload
    const existing = readNetworks();
    const existingMap = Object.fromEntries(existing.map(n => [n.name, n]));

    const merged = networks.map(net => {
      const old = existingMap[net.name];
      const vars = (net.vars || []).map(v => {
        if (v.v === '••••••••' && old) {
          const oldVar = (old.vars || []).find(ov => ov.k === v.k);
          return { k: v.k, v: oldVar?.v || '' };
        }
        return v;
      });
      return { ...net, vars };
    });

    writeNetworks(merged);
    res.json({ ok: true });
  });

  // POST /api/setup/start-one — start a single network
  app.post('/api/setup/start-one', requireAuth, async (req, res) => {
    const { network } = req.body || {};
    if (!network?.name || !network?.image) {
      return res.status(400).json({ error: 'اسم الشبكة وصورة Docker مطلوبان' });
    }

    // Merge with saved to get real secrets
    const saved = readNetworks();
    const savedNet = saved.find(n => n.name === network.name) || network;

    try {
      const file = writeNetworkCompose(savedNet);
      await composeFile(file, ['pull', '--quiet']);
      await composeFile(file, ['up', '-d']);

      // Update enabled status
      const nets = readNetworks();
      const idx = nets.findIndex(n => n.name === network.name);
      if (idx >= 0) { nets[idx].enabled = true; writeNetworks(nets); }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/setup/stop-one — stop a single network
  app.post('/api/setup/stop-one', requireAuth, async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });

    try {
      await docker(['stop', `nodepin_${name}`]).catch(() => {});
      await docker(['rm', `nodepin_${name}`]).catch(() => {});

      const nets = readNetworks();
      const idx = nets.findIndex(n => n.name === name);
      if (idx >= 0) { nets[idx].enabled = false; writeNetworks(nets); }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/setup/start-all — start all saved networks
  app.post('/api/setup/start-all', requireAuth, async (req, res) => {
    const nets = readNetworks();
    if (!nets.length) return res.status(400).json({ error: 'لا توجد شبكات محفوظة' });

    const errors = [];
    for (const net of nets) {
      try {
        const file = writeNetworkCompose(net);
        await composeFile(file, ['pull', '--quiet']);
        await composeFile(file, ['up', '-d']);
        net.enabled = true;
      } catch (err) {
        errors.push(`${net.name}: ${err.message}`);
      }
    }
    writeNetworks(nets);

    if (errors.length) {
      return res.status(207).json({ ok: false, error: errors.join(' | ') });
    }
    res.json({ ok: true });
  });
}

module.exports = { registerSetupRoutes, readNetworks };
