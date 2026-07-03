// Uprock provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'uprock',
    token: 'UPT',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://uprock.com/dashboard' },
  };
}
module.exports = { network: 'uprock', getMetrics };
