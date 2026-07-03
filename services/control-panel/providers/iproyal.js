// IPRoyal Pawns provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'iproyal',
    token: 'USD',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://pawns.app/dashboard' },
  };
}
module.exports = { network: 'iproyal', getMetrics };
