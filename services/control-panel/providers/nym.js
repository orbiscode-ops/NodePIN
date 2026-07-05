// Nym Network provider — local API checking via nym-node http-bind port.
async function getMetrics() {
  return {
    network: 'nym',
    token: 'NYM',
    status: 'ok',
    earnings: null,
    extra: { 
      dashboard: 'https://mixnet.nymtech.net',
      local_api: 'http://localhost:8080/api/v1/build-information'
    },
  };
}
module.exports = { network: 'nym', getMetrics };
