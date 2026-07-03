// Dynamic provider loader.
// Each provider module exports { network, getMetrics }.
// Only providers whose network is in ENABLED_NETWORKS are queried.
const fs = require('fs');
const path = require('path');

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

function enabledNetworks() {
  return (process.env.ENABLED_NETWORKS || 'mysterium,storj')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
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
