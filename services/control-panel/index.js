const express = require('express');
const Docker = require('dockerode');
const path = require('path');

const app = express();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || '';

// ── Middleware ──────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Key protection (optional)
app.use('/api', (req, res, next) => {
  if (!API_KEY) return next();
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ── Endpoints ───────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List all containers (NodeYield services)
app.get('/api/containers', async (_req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
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

// Placeholder: earnings & metrics
// TODO: integrate with each node's native API for real stats
app.get('/api/metrics', (_req, res) => {
  res.json({
    message: 'Placeholder — implement per-node API here',
    nodes: {
      mysterium: { status: 'not_implemented', token: 'MYST' },
      storj: { status: 'not_implemented', token: 'STORJ' }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[NodePIN] Control Panel running on http://0.0.0.0:${PORT}`);
});
