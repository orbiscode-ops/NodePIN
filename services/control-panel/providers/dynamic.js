// ═══════════════════════════════════════════
// NodePIN — Dynamic Provider
// Reads custom network definitions from networks.json and fetches
// earnings according to their earnType: local | web | link
// ═══════════════════════════════════════════
const { getJson, postJson } = require('./http');
const networksDb = require('../networks');

// In-memory JWT cache per network key  { key → { jwt, exp } }
const _jwtCache = {};

// ── Resolve a nested path like "data.balance" from an object ──
function resolvePath(obj, dotPath) {
  if (!dotPath || !obj) return null;
  return dotPath.split('.').reduce((o, k) => (o != null ? o[k] : null), obj);
}

// ── Build env-var map for a network's credentials ──────────
function getCredentials(netKey, credentials) {
  const creds = {};
  for (const c of credentials) {
    creds[c.key] = process.env[c.key] || '';
  }
  return creds;
}

// ── Fetch metrics for one custom network ───────────────────
async function fetchMetrics(net) {
  const base = {
    network:  net.key,
    name:     net.name,
    icon:     net.icon,
    token:    net.token,
    status:   'starting',
    earnings: null,
    extra:    {
      dashboard: net.dashboardUrl || null,
      custom:    true,
    },
  };

  // ── TYPE: link — no API, just report ok ──────────────────
  if (net.earnType === 'link') {
    return { ...base, status: 'ok' };
  }

  // ── TYPE: local — GET local API endpoint ─────────────────
  if (net.earnType === 'local') {
    try {
      const url = (net.localApiUrl || '').replace(/\/$/, '');
      const info = await getJson(url, { timeoutMs: 5000 });
      const earned = net.earningsPath
        ? resolvePath(info, net.earningsPath)
        : (info?.earnings ?? info?.balance ?? info?.total ?? null);

      return {
        ...base,
        status:   'ok',
        earnings: earned != null ? parseFloat(earned) : null,
        extra:    {
          ...base.extra,
          raw: info,
        },
      };
    } catch (err) {
      if (err.code === 'TIMEOUT' || err.code === 'UNREACHABLE') {
        return { ...base, status: 'starting' };
      }
      return { ...base, status: 'error', extra: { ...base.extra, message: err.message } };
    }
  }

  // ── TYPE: web — login → JWT → fetch balance ───────────────
  if (net.earnType === 'web') {
    const creds = getCredentials(net.key, net.credentials || []);

    // Check credentials present
    const missing = (net.credentials || []).filter(c => !creds[c.key]);
    if (missing.length) {
      return {
        ...base,
        status: 'not_configured',
        extra:  { ...base.extra, note: `Missing: ${missing.map(c => c.key).join(', ')}` },
      };
    }

    try {
      // Get JWT (cached)
      const cache = _jwtCache[net.key] || {};
      let jwt = cache.jwt && Date.now() < cache.exp ? cache.jwt : null;

      if (!jwt) {
        // Build login body from credentials
        const loginBody = {};
        for (const c of net.credentials) {
          loginBody[c.key.toLowerCase()] = creds[c.key];
          // Common aliases
          if (c.key.endsWith('_EMAIL'))    loginBody.email    = creds[c.key];
          if (c.key.endsWith('_PASSWORD') || c.key.endsWith('_PASS')) loginBody.password = creds[c.key];
          if (c.key.endsWith('_TOKEN'))    loginBody.token    = creds[c.key];
        }
        const loginRes = await postJson(net.loginUrl, loginBody, { timeoutMs: 8000 });
        // Try common JWT paths
        jwt = loginRes?.data?.access_token
           || loginRes?.access_token
           || loginRes?.token
           || loginRes?.jwt
           || null;
        if (!jwt) throw new Error('Login failed — no JWT in response');
        _jwtCache[net.key] = { jwt, exp: Date.now() + 55 * 60 * 1000 };
      }

      const balanceRes = await getJson(net.balanceUrl, {
        timeoutMs: 6000,
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const earned = net.earningsPath
        ? resolvePath(balanceRes, net.earningsPath)
        : (balanceRes?.data?.balance ?? balanceRes?.balance ?? balanceRes?.earnings ?? null);

      return {
        ...base,
        status:   'ok',
        earnings: earned != null ? parseFloat(earned) : null,
        extra:    { ...base.extra },
      };
    } catch (err) {
      if (err.code === 'TIMEOUT' || err.code === 'UNREACHABLE') {
        return { ...base, status: 'starting' };
      }
      // Clear JWT cache on auth errors
      delete _jwtCache[net.key];
      return { ...base, status: 'error', extra: { ...base.extra, message: err.message } };
    }
  }

  return { ...base, status: 'error', extra: { ...base.extra, message: 'earnType غير معروف' } };
}

// ── Load all enabled custom networks as providers ──────────
function loadCustomProviders() {
  const providers = {};
  const networks = networksDb.list().filter(n => n.enabled !== false);
  for (const net of networks) {
    providers[net.key] = {
      network:    net.key,
      getMetrics: () => fetchMetrics(net),
    };
  }
  return providers;
}

module.exports = { loadCustomProviders, fetchMetrics };
