const { test } = require('node:test');
const assert = require('node:assert');

function load(env) {
  for (const k of Object.keys(env)) process.env[k] = env[k];
  delete require.cache[require.resolve('../auth')];
  return require('../auth');
}

test('auth disabled when no password set', () => {
  const auth = load({ DASHBOARD_PASSWORD: '', SESSION_SECRET: 's' });
  assert.strictEqual(auth.authEnabled(), false);
});

test('checkPassword validates correct password only', () => {
  const auth = load({ DASHBOARD_PASSWORD: 'secret123', SESSION_SECRET: 's' });
  assert.strictEqual(auth.authEnabled(), true);
  assert.strictEqual(auth.checkPassword('secret123'), true);
  assert.strictEqual(auth.checkPassword('wrong'), false);
  assert.strictEqual(auth.checkPassword(''), false);
});

test('requireAuth passes through when disabled', () => {
  const auth = load({ DASHBOARD_PASSWORD: '', SESSION_SECRET: 's' });
  let called = false;
  auth.requireAuth({ headers: {}, path: '/api/metrics' }, {}, () => { called = true; });
  assert.strictEqual(called, true);
});

test('requireAuth rejects API request without session when enabled', () => {
  const auth = load({ DASHBOARD_PASSWORD: 'p', SESSION_SECRET: 's', API_KEY: '' });
  let status; let body;
  const res = {
    status(c) { status = c; return this; },
    json(b) { body = b; return this; },
  };
  auth.requireAuth({ headers: {}, path: '/api/metrics' }, res, () => {
    throw new Error('should not call next');
  });
  assert.strictEqual(status, 401);
  assert.deepStrictEqual(body, { error: 'Unauthorized' });
});

test('requireAuth accepts valid API key', () => {
  const auth = load({ DASHBOARD_PASSWORD: 'p', SESSION_SECRET: 's', API_KEY: 'k' });
  let called = false;
  auth.requireAuth({ headers: { 'x-api-key': 'k' }, path: '/api/metrics' }, {}, () => { called = true; });
  assert.strictEqual(called, true);
});
