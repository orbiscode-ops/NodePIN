// Grass (Wynd Network) provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'grass',
    token: 'GRASS',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://app.getgrass.io/dashboard' },
  };
}
module.exports = { network: 'grass', getMetrics };
