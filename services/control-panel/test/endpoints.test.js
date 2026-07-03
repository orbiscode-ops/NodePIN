const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Inject a mock Docker client before importing the app.
global.__DOCKER_MOCK__ = {
  listContainers: async () => ([
    {
      Id: 'abcdef1234567890', Names: ['/nodepin_myst'], Image: 'myst', State: 'running',
      Status: 'Up 2 minutes', Ports: [{ PublicPort: 4050, PrivatePort: 4050 }],
    },
  ]),
};
// No networks enabled → metrics returns empty nodes without any fetch.
process.env.ENABLED_NETWORKS = '';

const app = require('../index');

let server; let baseUrl;
before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});
after(() => server && server.close());

function get(pathname) {
  return new Promise((resolve, reject) => {
    http.get(baseUrl + pathname, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(body) }));
    }).on('error', reject);
  });
}

test('GET /api/health returns ok', async () => {
  const r = await get('/api/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.status, 'ok');
});

test('GET /api/containers returns NodePIN containers', async () => {
  const r = await get('/api/containers');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.count, 1);
  assert.strictEqual(r.json.containers[0].name, 'nodepin_myst');
});

test('GET /api/metrics returns aggregated structure', async () => {
  const r = await get('/api/metrics');
  assert.strictEqual(r.status, 200);
  assert.ok('nodes' in r.json);
  assert.ok('timestamp' in r.json);
});
