// Titan Network provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'titan',
    token: 'TTN',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://storage.titannet.io/dashboard' },
  };
}
module.exports = { network: 'titan', getMetrics };
