const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchMetrics } = require('../providers/dynamic');

function mockFetch(handler) {
  global.fetch = async (url, opts) => handler(String(url), opts || {});
}

test('dynamic provider fetchMetrics returns ok for link type', async () => {
  const net = {
    key: 'customlink',
    name: 'Custom Link',
    icon: '🔗',
    token: 'LINK',
    earnType: 'link',
    dashboardUrl: 'https://example.com',
    credentials: [],
    enabled: true,
  };

  const result = await fetchMetrics(net);
  assert.equal(result.network, 'customlink');
  assert.equal(result.status, 'ok');
  assert.equal(result.earnings, null);
  assert.equal(result.extra.dashboard, 'https://example.com');
  assert.equal(result.extra.custom, true);
});

test('dynamic provider fetchMetrics returns ok for local type', async () => {
  mockFetch((url) => {
    assert.equal(url, 'http://localhost:1234');
    return {
      ok: true,
      json: async () => ({ earnings: 12.34 }),
    };
  });

  const net = {
    key: 'customlocal',
    name: 'Custom Local',
    icon: '🖥️',
    token: 'LCL',
    earnType: 'local',
    localApiUrl: 'http://localhost:1234',
    credentials: [],
    enabled: true,
  };

  const result = await fetchMetrics(net);
  assert.equal(result.status, 'ok');
  assert.equal(result.earnings, 12.34);
});

test('dynamic provider fetchMetrics returns not_configured for missing web credentials', async () => {
  const net = {
    key: 'customweb',
    name: 'Custom Web',
    icon: '🌐',
    token: 'WEB',
    earnType: 'web',
    loginUrl: 'https://api.example.com/login',
    balanceUrl: 'https://api.example.com/balance',
    credentials: [
      { key: 'WEB_EMAIL', label: 'Email', type: 'text' },
      { key: 'WEB_PASS', label: 'Password', type: 'password' },
    ],
    enabled: true,
  };

  const result = await fetchMetrics(net);
  assert.equal(result.network, 'customweb');
  assert.equal(result.status, 'not_configured');
  assert.equal(result.earnings, null);
  assert.ok(result.extra.note.includes('WEB_EMAIL'));
});
