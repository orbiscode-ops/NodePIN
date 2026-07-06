// Sentinel dVPN provider.
async function getMetrics() {
  return {
    network: 'sentinel',
    token: 'DVPN',
    status: 'ok',
    earnings: null,
    extra: {
      moniker: process.env.SENTINEL_MONIKER || 'Unnamed-Node',
      dashboard: 'https://stats.sentinel.co',
      instructions: 'View container logs to find your generated wallet and fund it to register the node.'
    },
  };
}
module.exports = { network: 'sentinel', getMetrics };
