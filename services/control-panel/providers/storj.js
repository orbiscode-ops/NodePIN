// Storj provider — reads earnings/usage from the storagenode dashboard API.
// Contract: getMetrics() => { network, token, status, earnings, extra }
const { getJson } = require('./http');

const BASE = process.env.STORJ_API_URL || 'http://nodepin_storj:14002';

async function getMetrics() {
  const base = {
    network: 'storj',
    token: 'STORJ',
    status: 'starting',
    earnings: null,
    extra: {},
  };

  try {
    const sno = await getJson(`${BASE}/api/sno/`, { timeoutMs: 4000 });

    // Try to pull current-month estimated payout if available.
    let estimated = null;
    try {
      const payout = await getJson(`${BASE}/api/sno/estimated-payout`, { timeoutMs: 4000 });
      estimated = payout?.currentMonth?.payout ?? null; // cents
    } catch (_) {
      // estimated payout is optional; ignore if unavailable
    }

    return {
      ...base,
      status: sno?.quicStatus === 'OK' || sno?.lastPinged ? 'ok' : 'ok',
      earnings: estimated, // in cents (USD) if present
      extra: {
        nodeID: sno?.nodeID || null,
        version: sno?.version || null,
        upToDate: sno?.upToDate ?? null,
        diskSpaceUsed: sno?.diskSpace?.used ?? null,
        diskSpaceAvailable: sno?.diskSpace?.available ?? null,
        bandwidthUsed: sno?.bandwidth?.used ?? null,
        satellitesCount: Array.isArray(sno?.satellites) ? sno.satellites.length : null,
      },
    };
  } catch (err) {
    if (err.code === 'TIMEOUT' || err.code === 'UNREACHABLE') {
      return { ...base, status: 'starting' };
    }
    return { ...base, status: 'error', extra: { message: err.message } };
  }
}

module.exports = { network: 'storj', getMetrics };
