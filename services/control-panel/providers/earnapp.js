// EarnApp provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'earnapp',
    token: 'USD',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://earnapp.com/dashboard' },
  };
}
module.exports = { network: 'earnapp', getMetrics };
