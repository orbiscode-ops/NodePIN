// Honeygain provider — fetches earnings from Honeygain web API.
// Uses email+password to get a JWT token, then queries the balance endpoint.
// Contract: getMetrics() => { network, token, status, earnings, extra }
const { getJson, postJson } = require('./http');

const API = 'https://dashboard.honeygain.com/api/v1';
const EMAIL = process.env.HONEYGAIN_EMAIL || '';
const PASS  = process.env.HONEYGAIN_PASS  || '';

// Simple in-memory token cache (reuse until near expiry)
let _cache = { jwt: null, exp: 0 };

async function getJWT() {
  if (_cache.jwt && Date.now() < _cache.exp) return _cache.jwt;
  const data = await postJson(`${API}/users/tokens`, { email: EMAIL, password: PASS }, { timeoutMs: 8000 });
  const jwt = data?.data?.access_token;
  if (!jwt) throw new Error('Honeygain auth failed');
  _cache = { jwt, exp: Date.now() + 55 * 60 * 1000 }; // cache 55 min
  return jwt;
}

async function getMetrics() {
  const base = { network: 'honeygain', token: 'USD', status: 'starting', earnings: null, extra: {} };

  if (!EMAIL || !PASS) {
    return { ...base, status: 'not_configured', extra: { note: 'Set HONEYGAIN_EMAIL and HONEYGAIN_PASS in .env' } };
  }

  try {
    const jwt = await getJWT();
    const headers = { Authorization: `Bearer ${jwt}` };

    // Fetch balance and stats in parallel
    const [balanceRes, statsRes] = await Promise.all([
      getJson(`${API}/users/balances`, { timeoutMs: 6000, headers }),
      getJson(`${API}/devices/earnings/total`, { timeoutMs: 6000, headers }).catch(() => null),
    ]);

    const credits    = balanceRes?.data?.pots?.find(p => p.type === 'honeygain')?.credits ?? 0;
    const totalUSD   = (credits / 1000).toFixed(3); // 1000 credits = $1
    const totalEarned = statsRes?.data?.total_usd ?? null;

    return {
      ...base,
      status: 'ok',
      earnings: parseFloat(totalUSD),
      extra: {
        balanceCredits: credits,
        balanceUSD: '$' + totalUSD,
        totalEarnedUSD: totalEarned ? '$' + parseFloat(totalEarned).toFixed(3) : null,
        dashboard: 'https://dashboard.honeygain.com',
      },
    };
  } catch (err) {
    if (err.code === 'TIMEOUT' || err.code === 'UNREACHABLE') {
      return { ...base, status: 'starting' };
    }
    // Reset cache on auth error so next call retries login
    _cache = { jwt: null, exp: 0 };
    return { ...base, status: 'error', extra: { message: err.message } };
  }
}

module.exports = { network: 'honeygain', getMetrics };
