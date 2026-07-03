// PacketStream provider.
// PacketStream shares bandwidth but exposes no local earnings API — earnings are
// only visible on the web dashboard. We report a running/idle status by checking
// the container via Docker (handled by /api/containers) and expose a link here.
// Contract: getMetrics() => { network, token, status, earnings, extra }
async function getMetrics() {
  return {
    network: 'packetstream',
    token: 'USD',
    status: 'ok',
    earnings: null, // no local API; see PacketStream dashboard
    extra: {
      note: 'Earnings are only available on the PacketStream web dashboard.',
      dashboard: 'https://packetstream.io/dashboard',
    },
  };
}

module.exports = { network: 'packetstream', getMetrics };
