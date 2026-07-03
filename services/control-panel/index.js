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

// Start server only when run directly (not when imported by tests).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[NodePIN] Control Panel running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
