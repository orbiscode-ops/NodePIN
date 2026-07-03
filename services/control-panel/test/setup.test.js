// Tests for Setup Wizard backend routes
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Use a temp dir so tests never touch real /app/data
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nodepin-setup-'));
process.env.DATA_DIR = TMP;
process.env.DASHBOARD_PASSWORD = '';  // auth disabled for tests

const app = require('../index');

async function req(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  // Use built-in fetch (Node 18+)
  const base = 'http://localhost:13737';
  return fetch(base + url, opts);
}

let server;
before(() => new Promise(resolve => { server = app.listen(13737, resolve); }));
after(() => new Promise(resolve => {
  server.close(resolve);
  fs.rmSync(TMP, { recursive: true, force: true });
}));

describe('Setup Wizard API', () => {
  it('GET /api/setup/fields returns network definitions', async () => {
    const r = await req('GET', '/api/setup/fields');
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.ok(data.mysterium, 'mysterium fields present');
    assert.ok(data.storj, 'storj fields present');
    assert.ok(Array.isArray(data.mysterium));
  });

  it('GET /api/setup/status returns setupDone=false initially', async () => {
    const r = await req('GET', '/api/setup/status');
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.setupDone, false);
    assert.deepEqual(data.configured, []);
  });

  it('POST /api/setup/save rejects empty networks', async () => {
    const r = await req('POST', '/api/setup/save', { networks: [], values: {} });
    assert.equal(r.status, 400);
  });

  it('POST /api/setup/save rejects missing required fields', async () => {
    const r = await req('POST', '/api/setup/save', {
      networks: ['mysterium'],
      values: {}   // MYST_IDENTITY_PASSPHRASE missing
    });
    assert.equal(r.status, 400);
    const data = await r.json();
    assert.ok(data.error.includes('mysterium'));
  });

  it('POST /api/setup/save saves valid mysterium config', async () => {
    const r = await req('POST', '/api/setup/save', {
      networks: ['mysterium'],
      values: { MYST_IDENTITY_PASSPHRASE: 'test_passphrase_123' }
    });
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.ok, true);
    assert.deepEqual(data.networks, ['mysterium']);
  });

  it('GET /api/setup/status shows mysterium as configured after save', async () => {
    const r = await req('GET', '/api/setup/status');
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.ok(data.configured.includes('mysterium'));
    assert.equal(data.setupDone, true);
  });

  it('GET /api/setup/values masks secrets', async () => {
    const r = await req('GET', '/api/setup/values');
    assert.equal(r.status, 200);
    const data = await r.json();
    // Passphrase should be masked
    assert.equal(data.MYST_IDENTITY_PASSPHRASE, '••••••••');
    // Non-secret fields should be readable
    assert.equal(data.ENABLED_NETWORKS, 'mysterium');
  });

  it('POST /api/setup/save saves multi-network config', async () => {
    const r = await req('POST', '/api/setup/save', {
      networks: ['mysterium', 'packetstream'],
      values: {
        MYST_IDENTITY_PASSPHRASE: 'pass123',
        PACKETSTREAM_CID: '99999'
      }
    });
    assert.equal(r.status, 200);
    const status = await (await req('GET', '/api/setup/status')).json();
    assert.ok(status.enabled.includes('mysterium'));
    assert.ok(status.enabled.includes('packetstream'));
  });
});
