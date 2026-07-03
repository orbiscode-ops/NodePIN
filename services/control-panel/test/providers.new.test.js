// Tests for new network providers (no-API providers + honeygain + earnapp + bitping + nodepay)
const { it } = require('node:test');
const assert = require('node:assert/strict');

// ── No-API providers (fire-and-forget) ───────────────
const noApiProviders = [
  { name: 'traffmonetizer', mod: require('../providers/traffmonetizer'), dashboard: 'traffmonetizer.com' },
  { name: 'iproyal',        mod: require('../providers/iproyal'),        dashboard: 'pawns.app' },
  { name: 'peer2profit',    mod: require('../providers/peer2profit'),     dashboard: 'peer2profit.com' },
  { name: 'repocket',       mod: require('../providers/repocket'),        dashboard: 'repocket.co' },
  { name: 'earnapp',        mod: require('../providers/earnapp'),         dashboard: 'earnapp.com' },
  { name: 'nodepay',        mod: require('../providers/nodepay'),         dashboard: 'nodepay.ai' },
  { name: 'grass',          mod: require('../providers/grass'),           dashboard: 'getgrass.io' },
  { name: 'packetstream',   mod: require('../providers/packetstream'),    dashboard: 'packetstream.io' },
  { name: 'proxyrack',      mod: require('../providers/proxyrack'),       dashboard: 'proxyrack.com' },
  { name: 'gradient',       mod: require('../providers/gradient'),        dashboard: 'gradient.network' },
  { name: 'uprock',         mod: require('../providers/uprock'),          dashboard: 'uprock.com' },
  { name: 'titan',          mod: require('../providers/titan'),           dashboard: 'titannet.io' },
];

for (const { name, mod, dashboard } of noApiProviders) {
  it(`${name} provider reports ok with dashboard link`, async () => {
    const result = await mod.getMetrics();
    assert.equal(result.network, name);
    assert.equal(result.status, 'ok');
    assert.equal(result.earnings, null);
    assert.ok(result.extra?.dashboard?.includes(dashboard),
      `Expected dashboard link to include "${dashboard}", got: ${result.extra?.dashboard}`);
  });
}

// ── Honeygain: not_configured when no credentials ────
it('honeygain provider reports not_configured without credentials', async () => {
  delete process.env.HONEYGAIN_EMAIL;
  delete process.env.HONEYGAIN_PASS;
  // Re-require to pick up env changes
  jest_compat_delete_cache('../providers/honeygain');
  const mod = require('../providers/honeygain');
  const result = await mod.getMetrics();
  assert.equal(result.network, 'honeygain');
  assert.equal(result.status, 'not_configured');
  assert.equal(result.earnings, null);
});

// ── Meson: reports starting when node is unreachable ──
it('meson provider reports starting when node is unreachable', async () => {
  process.env.MESON_API_URL = 'http://127.0.0.1:19999';
  jest_compat_delete_cache('../providers/meson');
  const mod = require('../providers/meson');
  const result = await mod.getMetrics();
  assert.equal(result.network, 'meson');
  assert.ok(['starting', 'error'].includes(result.status),
    `Expected starting or error, got: ${result.status}`);
  assert.ok(result.extra?.dashboard?.includes('meson.network'),
    `Expected dashboard link, got: ${result.extra?.dashboard}`);
});

// ── Huddle01: reports starting when node is unreachable ─
it('huddle01 provider reports starting when node is unreachable', async () => {
  process.env.HUDDLE01_API_URL = 'http://127.0.0.1:19998';
  jest_compat_delete_cache('../providers/huddle01');
  const mod = require('../providers/huddle01');
  const result = await mod.getMetrics();
  assert.equal(result.network, 'huddle01');
  assert.ok(['starting', 'error'].includes(result.status),
    `Expected starting or error, got: ${result.status}`);
  assert.ok(result.extra?.dashboard?.includes('huddle01.com'),
    `Expected dashboard link, got: ${result.extra?.dashboard}`);
});

// ── Bitping: reports starting when node is unreachable ─
it('bitping provider reports starting when node is unreachable', async () => {
  process.env.BITPING_API_URL = 'http://127.0.0.1:19999'; // nothing listening
  jest_compat_delete_cache('../providers/bitping');
  const mod = require('../providers/bitping');
  const result = await mod.getMetrics();
  assert.equal(result.network, 'bitping');
  assert.ok(['starting', 'error'].includes(result.status),
    `Expected starting or error, got: ${result.status}`);
  assert.ok(result.extra?.dashboard?.includes('bitping.com'),
    `Expected dashboard link, got: ${result.extra?.dashboard}`);
});

function jest_compat_delete_cache(modPath) {
  const resolved = require.resolve(modPath);
  delete require.cache[resolved];
}
