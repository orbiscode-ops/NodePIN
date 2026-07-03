// Dynamic provider loader.
// Each provider module exports { network, getMetrics }.
// Only providers whose network is in ENABLED_NETWORKS are queried.
// Custom networks (from networks.json) are merged in automatically.
const fs = require('fs');
const path = require('path');
const { loadCustomProviders } = require('./dynamic');

function loadProviders() {
  const dir = __dirname;
  const skip = new Set(['index.js', 'http.js', 'dynamic.js']);
  const providers = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js') || skip.has(file)) continue;
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const mod = require(path.join(dir, file));
    if (mod && mod.network && typeof mod.getMetrics === 'function') {
      providers[mod.network] = mod;
    }
  }
  // Merge in custom (user-defined) networks — they override nothing built-in
  const custom = loadCustomProviders();
  for (const [key, mod] of Object.entries(custom)) {
    if (!providers[key]) providers[key] = mod;
  }
  return providers;
}

function enabledNetworks() {
  const { list } = require('../networks');
  const fromEnv = (process.env.ENABLED_NETWORKS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  // Also include enabled custom networks not already in the env list
  const customKeys = list().filter(n => n.enabled !== false).map(n => n.key);
  const all = [...new Set([...fromEnv, ...customKeys])];
  return all;
}

// Query all enabled providers in parallel; never let one failure break the rest.
async function collectMetrics() {
  const providers = loadProviders();
  const enabled = enabledNetworks();
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
  for (const r of results) nodes[r.network] = r;
  return { enabled, nodes };
}

module.exports = { loadProviders, enabledNetworks, collectMetrics };
