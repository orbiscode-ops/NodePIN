// Bitping provider — fetches earnings from Bitping local API.
// Contract: getMetrics() => { network, token, status, earnings, extra }
const { getJson } = require('./http');

// Bitping exposes a local dashboard API on port 9090 inside the container.
// We read it from the control panel via the internal Docker network.
const BASE = process.env.BITPING_API_URL || 'http://nodepin_bitping:9090';

async function getMetrics() {
  const base = {
    network: 'bitping',
    token: 'NOIA',
    status: 'starting',
    earnings: null,
    extra: { dashboard: 'https://app.bitping.com' },
  };

  try {
    const info = await getJson(`${BASE}/api/v1/node`, { timeoutMs: 5000 });

    // Bitping returns earnings in NOIA with a "balance" or "earned" field.
    const earned = info?.earned ?? info?.balance ?? null;

    return {
      ...base,
      status: 'ok',
      earnings: earned ? parseFloat(earned) : null,
      extra: {
        ...base.extra,
        nodeId: info?.nodeId || null,
        uptime: info?.uptime || null,
        earnedDisplay: earned ? `${parseFloat(earned).toFixed(4)} NOIA` : null,
      },
    };
  } catch (err) {
    if (err.code === 'TIMEOUT' || err.code === 'UNREACHABLE') {
      return { ...base, status: 'starting' };
    }
    return { ...base, status: 'error', extra: { ...base.extra, message: err.message } };
  }
}

module.exports = { network: 'bitping', getMetrics };
