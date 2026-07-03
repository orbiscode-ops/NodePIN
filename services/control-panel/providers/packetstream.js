// PacketStream provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'packetstream',
    token: 'USD',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://packetstream.io/dashboard' },
  };
}
module.exports = { network: 'packetstream', getMetrics };
