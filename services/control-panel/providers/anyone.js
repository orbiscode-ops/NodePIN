// Anyone Protocol provider — link-only rewards tracker.
// Contract: getMetrics() => { network, token, status, earnings, extra }
async function getMetrics() {
  return {
    network: 'anyone',
    token: 'ANYONE',
    status: 'ok',
    earnings: null,
    extra: {
      dashboard: 'https://dashboard.anyone.io',
    },
  };
}

module.exports = { network: 'anyone', getMetrics };
