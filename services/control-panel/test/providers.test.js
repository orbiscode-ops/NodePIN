const { test } = require('node:test');
const assert = require('node:assert');
const { loadProviders, collectMetrics } = require('../providers');

function mockFetch(handler) {
  global.fetch = async (url, opts) => handler(String(url), opts || {});
}

test('loadProviders returns all 17 built-in providers', () => {
  const providers = loadProviders();
  const keys = Object.keys(providers);
  assert.strictEqual(keys.length, 17);
  assert.ok(keys.includes('mysterium'));
  assert.ok(keys.includes('storj'));
  assert.ok(keys.includes('anyone'));
});

test('collectMetrics returns mysterium by default when no enabled networks exist', async () => {
  process.env.ENABLED_NETWORKS = '';
  const data = await collectMetrics();
  assert.deepStrictEqual(data.enabled, ['mysterium']);
  assert.ok('mysterium' in data.nodes);
});

test('collectMetrics keeps enabled network names even when some are enabled', async () => {
  process.env.ENABLED_NETWORKS = 'mysterium';
  const data = await collectMetrics();
  assert.deepStrictEqual(data.enabled, ['mysterium']);
  assert.ok('mysterium' in data.nodes);
});
