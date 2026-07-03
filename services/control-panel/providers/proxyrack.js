// Proxyrack provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'proxyrack',
    token: 'USD',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://peer.proxyrack.com/dashboard' },
  };
}
module.exports = { network: 'proxyrack', getMetrics };
