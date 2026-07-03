// Repocket provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'repocket',
    token: 'USD',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://app.repocket.co/dashboard' },
  };
}
module.exports = { network: 'repocket', getMetrics };
