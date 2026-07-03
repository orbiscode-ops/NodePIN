// Peer2Profit provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'peer2profit',
    token: 'USD',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://peer2profit.com/cabinet' },
  };
}
module.exports = { network: 'peer2profit', getMetrics };
