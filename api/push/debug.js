const {
  errorMessage,
  getVapidConfig,
  loadStore,
  sendJson,
  setNoStore
} = require("../_lib/push-core");

module.exports = async function handler(_req, res) {
  setNoStore(res);
  try {
    const store = await loadStore();
    const config = getVapidConfig();
    sendJson(res, 200, {
      ok: true,
      vapidPublicKeyConfigured: !!config.publicKey,
      vapidPrivateKeyConfigured: !!config.privateKey,
      subscriptions: Array.isArray(store.subscriptions) ? store.subscriptions.length : 0,
      clients: Array.isArray(store.subscriptions)
        ? store.subscriptions.map(item => ({
            clientId: item.clientId,
            endpointHost: endpointHost(item.subscription && item.subscription.endpoint),
            enabled: !!(item.settings && item.settings.enabled),
            timezone: item.timezone || "",
            updatedAt: item.updatedAt || ""
          }))
        : []
    });
  } catch (err) {
    sendJson(res, err.statusCode || 500, { ok: false, error: errorMessage(err) });
  }
};

function endpointHost(endpoint) {
  if (typeof endpoint !== "string" || !endpoint) return "";
  try {
    return new URL(endpoint).hostname;
  } catch {
    return "";
  }
}
