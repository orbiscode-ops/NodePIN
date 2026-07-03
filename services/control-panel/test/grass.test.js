const { test } = require('node:test');
const assert = require('node:assert');

test('grass provider reports ok with dashboard link', async () => {
  delete require.cache[require.resolve('../providers/grass')];
  const { network, getMetrics } = require('../providers/grass');
  assert.strictEqual(network, 'grass');
  const m = await getMetrics();
  assert.strictEqual(m.status, 'ok');
  assert.strictEqual(m.earnings, null);
  assert.ok(m.extra.dashboard.includes('getgrass.io'));
});
