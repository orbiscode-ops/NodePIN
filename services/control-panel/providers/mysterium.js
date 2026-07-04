// Mysterium provider — reads earnings/session from the local TequilAPI.
// Contract: getMetrics() => { network, token, status, earnings, extra }
const { getJson } = require('./http');

const BASE = process.env.MYST_API_URL || 'http://nodepin_myst:4050';

async function getMetrics() {
  const base = {
    network: 'mysterium',
    token: 'MYST',
    status: 'starting',
    earnings: null,
    extra: {},
  };

  const pass = process.env.MYST_API_PASSWORD || 'mystberry';
  const headers = {
    Authorization: 'Basic ' + Buffer.from(`myst:${pass}`).toString('base64'),
  };

  try {
    // Identities list → pick the first registered identity.
    const ids = await getJson(`${BASE}/tequilapi/identities`, { timeoutMs: 4000, headers });
    const identity = ids?.identities?.[0]?.id;
    if (!identity) return { ...base, status: 'no_identity' };

    const info = await getJson(`${BASE}/tequilapi/identities/${identity}`, { timeoutMs: 4000, headers });

    // Balance is returned in the smallest unit; expose both raw + a human value.
    const balanceRaw = info?.balance ?? 0;
    const earningsRaw = info?.earnings ?? 0;
    const earningsTotalRaw = info?.earningsTotal ?? 0;

    return {
      ...base,
      status: 'ok',
      earnings: earningsTotalRaw,
      extra: {
        identity,
        registrationStatus: info?.registrationStatus || 'Unknown',
        channelAddress: info?.channelAddress || null,
        balance: balanceRaw,
        earningsUnsettled: earningsRaw,
      },
    };
  } catch (err) {
    // Node not ready yet → report "starting" instead of erroring the whole dashboard.
    if (err.code === 'TIMEOUT' || err.code === 'UNREACHABLE') {
      return { ...base, status: 'starting' };
    }
    return { ...base, status: 'error', extra: { message: err.message } };
  }
}

module.exports = { network: 'mysterium', getMetrics };
