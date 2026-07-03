const { test } = require('node:test');
const assert = require('node:assert');

test('packetstream provider reports ok with dashboard link', async () => {
  delete require.cache[require.resolve('../providers/packetstream')];
  const { network, getMetrics } = require('../providers/packetstream');
  assert.strictEqual(network, 'packetstream');
  const m = await getMetrics();
  assert.strictEqual(m.network, 'packetstream');
  assert.strictEqual(m.status, 'ok');
  assert.strictEqual(m.earnings, null);
  assert.ok(m.extra.dashboard.includes('packetstream.io'));
});
