const { test } = require('node:test');
const assert = require('node:assert');
const { loadProviders, collectMetrics } = require('../providers');

function mockFetch(handler) {
  global.fetch = async (url, opts) => handler(String(url), opts || {});
}

test('loadProviders returns no built-in providers after cleanup', () => {
  const providers = loadProviders();
  assert.deepStrictEqual(Object.keys(providers), []);
});

test('collectMetrics returns empty data when no enabled networks exist', async () => {
  process.env.ENABLED_NETWORKS = '';
  const data = await collectMetrics();
  assert.deepStrictEqual(data.enabled, []);
  assert.deepStrictEqual(data.nodes, {});
});

test('collectMetrics keeps enabled network names even when providers are missing', async () => {
  process.env.ENABLED_NETWORKS = 'customnetwork';
  const data = await collectMetrics();
  assert.deepStrictEqual(data.enabled, ['customnetwork']);
  assert.deepStrictEqual(data.nodes, {});
});
