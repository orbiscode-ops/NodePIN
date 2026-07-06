// BlockMesh provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'blockmesh',
    token: 'POINTS',
    status: 'ok',
    earnings: null,
    extra: {
      dashboard: 'https://app.blockmesh.xyz'
    },
  };
}
module.exports = { network: 'blockmesh', getMetrics };
