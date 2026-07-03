// Meson Network provider — fetches earnings from the local Meson node API.
// Contract: getMetrics() => { network, token, status, earnings, extra }
const { getJson } = require('./http');

const BASE = process.env.MESON_API_URL || 'http://nodepin_meson:19090';

async function getMetrics() {
  const base = {
    network: 'meson',
    token: 'MSN',
    status: 'starting',
    earnings: null,
    extra: { dashboard: 'https://dashboard.meson.network' },
  };

  try {
    const info = await getJson(`${BASE}/api/v1/stat`, { timeoutMs: 5000 });

    const earned  = info?.data?.totalEarning  ?? info?.totalEarning  ?? null;
    const balance = info?.data?.balance       ?? info?.balance       ?? null;
    const online  = info?.data?.online        ?? info?.online        ?? null;

    return {
      ...base,
      status: 'ok',
      earnings: earned ? parseFloat(earned) : null,
      extra: {
        ...base.extra,
        balance:        balance  ? parseFloat(balance).toFixed(4) + ' MSN' : null,
        totalEarning:   earned   ? parseFloat(earned).toFixed(4)  + ' MSN' : null,
        online,
      },
    };
  } catch (err) {
    if (err.code === 'TIMEOUT' || err.code === 'UNREACHABLE') {
      return { ...base, status: 'starting' };
    }
    return { ...base, status: 'error', extra: { ...base.extra, message: err.message } };
  }
}

module.exports = { network: 'meson', getMetrics };
