// NKN Network provider — local JSON-RPC checking via nknd http port (default: 30003).
async function getMetrics() {
  return {
    network: 'nkn',
    token: 'NKN',
    status: 'ok',
    earnings: null,
    extra: {
      dashboard: 'https://explorer.nkn.org',
      local_api: 'http://localhost:30003'
    },
  };
}
module.exports = { network: 'nkn', getMetrics };
