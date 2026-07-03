// Grass provider.
// Grass shares bandwidth but exposes no local earnings API — earnings/points are
// only visible on the web dashboard. We report a running status + a link here.
// Contract: getMetrics() => { network, token, status, earnings, extra }
async function getMetrics() {
  return {
    network: 'grass',
    token: 'GRASS',
    status: 'ok',
    earnings: null, // no local API; see Grass dashboard
    extra: {
      note: 'Points/earnings are only available on the Grass web dashboard.',
      dashboard: 'https://app.getgrass.io',
    },
  };
}

module.exports = { network: 'grass', getMetrics };
