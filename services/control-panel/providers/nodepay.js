// Nodepay provider — no local API, earnings via web dashboard only.
async function getMetrics() {
  return {
    network: 'nodepay',
    token: 'NC',
    status: 'ok',
    earnings: null,
    extra: { dashboard: 'https://app.nodepay.ai' },
  };
}
module.exports = { network: 'nodepay', getMetrics };
