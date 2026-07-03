const { test } = require('node:test');
const assert = require('node:assert');

function mockFetch(handler) {
  global.fetch = async (url) => handler(String(url));
}
function fresh() {
  for (const f of ['../providers', '../providers/mysterium', '../providers/storj', '../providers/http']) {
    try { delete require.cache[require.resolve(f)]; } catch (_) {}
  }
}

test('mysterium provider returns ok with earnings', async () => {
  fresh();
  mockFetch((url) => {
    if (url.endsWith('/tequilapi/identities')) {
      return { ok: true, json: async () => ({ identities: [{ id: '0xabc' }] }) };
    }
    if (url.includes('/tequilapi/identities/0xabc')) {
      return { ok: true, json: async () => ({ balance: 100, earnings: 5, earningsTotal: 42, registrationStatus: 'Registered' }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  const { getMetrics } = require('../providers/mysterium');
  const m = await getMetrics();
  assert.strictEqual(m.status, 'ok');
  assert.strictEqual(m.earnings, 42);
  assert.strictEqual(m.extra.identity, '0xabc');
});

test('mysterium provider reports starting on timeout', async () => {
  fresh();
  mockFetch(() => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; });
  const { getMetrics } = require('../providers/mysterium');
  const m = await getMetrics();
  assert.strictEqual(m.status, 'starting');
});

test('storj provider returns ok with usage + payout', async () => {
  fresh();
  mockFetch((url) => {
    if (url.endsWith('/api/sno/')) {
      return { ok: true, json: async () => ({ nodeID: 'n1', version: '1.0.0', upToDate: true, diskSpace: { used: 10, available: 100 }, bandwidth: { used: 5 }, satellites: [{}, {}] }) };
    }
    if (url.includes('estimated-payout')) {
      return { ok: true, json: async () => ({ currentMonth: { payout: 1234 } }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  const { getMetrics } = require('../providers/storj');
  const m = await getMetrics();
  assert.strictEqual(m.status, 'ok');
  assert.strictEqual(m.earnings, 1234);
  assert.strictEqual(m.extra.satellitesCount, 2);
});

test('collectMetrics only queries ENABLED_NETWORKS', async () => {
  fresh();
  process.env.ENABLED_NETWORKS = 'mysterium';
  mockFetch((url) => {
    if (url.endsWith('/tequilapi/identities')) {
      return { ok: true, json: async () => ({ identities: [{ id: '0xabc' }] }) };
    }
    if (url.includes('/tequilapi/identities/')) {
      return { ok: true, json: async () => ({ earningsTotal: 7 }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  const { collectMetrics } = require('../providers');
  const data = await collectMetrics();
  assert.deepStrictEqual(data.enabled, ['mysterium']);
  assert.ok(data.nodes.mysterium);
  assert.strictEqual(data.nodes.storj, undefined);
});
