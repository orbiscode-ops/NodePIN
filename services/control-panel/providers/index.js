// Provider loader.
// Each provider module exports { network, getMetrics }.
// Only providers whose network is in ENABLED_NETWORKS are queried.
const fs = require('fs');
const path = require('path');
const Docker = require('dockerode');

const docker = global.__DOCKER_MOCK__ || new Docker({ socketPath: '/var/run/docker.sock' });

function loadProviders() {
  const dir = __dirname;
  const skip = new Set(['index.js', 'http.js']);
  const providers = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js') || skip.has(file)) continue;
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const mod = require(path.join(dir, file));
    if (mod && mod.network && typeof mod.getMetrics === 'function') {
      providers[mod.network] = mod;
    }
  }
  return providers;
}

async function enabledNetworks() {
  // 1. Fallback to process.env.ENABLED_NETWORKS if explicitly defined (tests/manual overrides)
  if (process.env.ENABLED_NETWORKS) {
    const fromEnv = process.env.ENABLED_NETWORKS
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    return [...new Set(['mysterium', ...fromEnv])];
  }

  // 2. Otherwise, auto-detect active networks by listing running docker containers
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: ['com.nodepin.project=nodepin'] }
    });
    const running = containers
      .filter(c => c.State === 'running')
      .map(c => c.Labels['com.nodepin.network'])
      .filter(Boolean);
    return [...new Set(['mysterium', ...running])];
  } catch (err) {
    // Fail-safe default
    return ['mysterium'];
  }
}

// Query all enabled providers in parallel; never let one failure break the rest.
async function collectMetrics() {
  const providers = loadProviders();
  const enabled = await enabledNetworks();
  const targets = enabled.filter(n => providers[n]);

  const results = await Promise.all(
    targets.map(async (n) => {
      try {
        return await providers[n].getMetrics();
      } catch (err) {
        return { network: n, status: 'error', earnings: null, extra: { message: err.message } };
      }
    })
  );

  const nodes = {};
  for (const r of results) {
    if (Array.isArray(r)) {
      for (const item of r) {
        // Use moniker or moniker-type as the key, fallback to network name
        const key = item.moniker || item.network;
        nodes[key] = item;
      }
    } else {
      nodes[r.network] = r;
    }
  }
  return { enabled, nodes };
}

module.exports = { loadProviders, enabledNetworks, collectMetrics };
