// Huddle01 Media Node provider — fetches earnings from the local node API.
// Contract: getMetrics() => { network, token, status, earnings, extra }
const { getJson } = require('./http');

const BASE = process.env.HUDDLE01_API_URL || 'http://nodepin_huddle01:4001';

async function getMetrics() {
  const base = {
    network: 'huddle01',
    token: 'HUDL',
    status: 'starting',
    earnings: null,
    extra: { dashboard: 'https://node.huddle01.com' },
  };

  try {
    const info = await getJson(`${BASE}/api/status`, { timeoutMs: 5000 });

    const earned  = info?.earnings  ?? info?.totalEarned ?? null;
    const uptime  = info?.uptime    ?? null;
    const nodeId  = info?.nodeId    ?? info?.id          ?? null;

    return {
      ...base,
      status: 'ok',
      earnings: earned ? parseFloat(earned) : null,
      extra: {
        ...base.extra,
        nodeId,
        uptime,
        earnedDisplay: earned ? parseFloat(earned).toFixed(4) + ' HUDL' : null,
      },
    };
  } catch (err) {
    if (err.code === 'TIMEOUT' || err.code === 'UNREACHABLE') {
      return { ...base, status: 'starting' };
    }
    return { ...base, status: 'error', extra: { ...base.extra, message: err.message } };
  }
}

module.exports = { network: 'huddle01', getMetrics };
