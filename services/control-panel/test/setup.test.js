// Tests for Setup Wizard backend (open / free-form)
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nodepin-setup-'));
process.env.DATA_DIR = TMP;
process.env.DASHBOARD_PASSWORD = '';

const app = require('../index');

async function req(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch('http://localhost:13737' + url, opts);
}

let server;
before(() => new Promise(resolve => { server = app.listen(13737, resolve); }));
after(() => new Promise(resolve => {
  server.close(resolve);
  fs.rmSync(TMP, { recursive: true, force: true });
}));

describe('Setup Wizard API (open)', () => {
  it('GET /api/setup/custom returns empty list initially', async () => {
    const r = await req('GET', '/api/setup/custom');
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.deepEqual(d.networks, []);
  });

  it('POST /api/setup/custom saves networks', async () => {
    const r = await req('POST', '/api/setup/custom', {
      networks: [
        { name: 'earnapp', image: 'earnapp/earnapp:latest', vars: [{ k: 'EARNAPP_UUID', v: 'test-uuid' }], enabled: false },
        { name: 'honeygain', image: 'honeygain/honeygain:latest', vars: [{ k: 'HONEYGAIN_EMAIL', v: 'a@b.com' }, { k: 'HONEYGAIN_PASS', v: 'secret123' }], enabled: false },
      ]
    });
    assert.equal(r.status, 200);
  });

  it('GET /api/setup/custom masks secrets', async () => {
    const r = await req('GET', '/api/setup/custom');
    const d = await r.json();
    assert.equal(d.networks.length, 2);
    const hg = d.networks.find(n => n.name === 'honeygain');
    const passVar = hg.vars.find(v => v.k === 'HONEYGAIN_PASS');
    assert.equal(passVar.v, '••••••••');
    // Non-secret should be visible
    const emailVar = hg.vars.find(v => v.k === 'HONEYGAIN_EMAIL');
    assert.equal(emailVar.v, 'a@b.com');
  });

  it('POST /api/setup/custom preserves secrets when masked payload sent', async () => {
    // Send masked password back — backend should keep real value
    const r = await req('POST', '/api/setup/custom', {
      networks: [
        { name: 'honeygain', image: 'honeygain/honeygain:latest',
          vars: [{ k: 'HONEYGAIN_EMAIL', v: 'new@email.com' }, { k: 'HONEYGAIN_PASS', v: '••••••••' }],
          enabled: false },
      ]
    });
    assert.equal(r.status, 200);

    // Read raw file to confirm secret preserved
    const { readNetworks } = require('../setup');
    const nets = readNetworks();
    const hg = nets.find(n => n.name === 'honeygain');
    assert.equal(hg.vars.find(v => v.k === 'HONEYGAIN_PASS').v, 'secret123');
    assert.equal(hg.vars.find(v => v.k === 'HONEYGAIN_EMAIL').v, 'new@email.com');
  });

  it('POST /api/setup/start-one rejects missing name', async () => {
    const r = await req('POST', '/api/setup/start-one', { network: { image: 'x:latest' } });
    assert.equal(r.status, 400);
  });

  it('POST /api/setup/stop-one accepts valid name (docker may fail in test)', async () => {
    const r = await req('POST', '/api/setup/stop-one', { name: 'earnapp' });
    // 200 or 500 both ok in test env (no real docker)
    assert.ok([200, 500].includes(r.status));
  });
});
