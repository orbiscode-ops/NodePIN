// URnetwork provider — no local API, earnings and node status via web dashboard only.
const getMetrics = async () => {
  return {
    network: 'urnetwork',
    status: 'unknown',
    earnings: null,
    extra: { dashboard: 'https://ur.io' }
  };
};

module.exports = { network: 'urnetwork', getMetrics };
