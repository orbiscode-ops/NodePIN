// Gradient Network provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'gradient',
    token: 'GRAD',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://app.gradient.network/dashboard' },
  };
}
module.exports = { network: 'gradient', getMetrics };
