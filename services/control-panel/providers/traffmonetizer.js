// Traffmonetizer provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'traffmonetizer',
    token: 'USD',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://traffmonetizer.com/dashboard' },
  };
}
module.exports = { network: 'traffmonetizer', getMetrics };
