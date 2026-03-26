const {
  getVapidConfig,
  sendJson,
  setNoStore
} = require("../_lib/push-core");

module.exports = async function handler(_req, res) {
  setNoStore(res);
  const config = getVapidConfig();
  if (!config.publicKey) {
    sendJson(res, 503, { error: "VAPID key is not configured on server." });
    return;
  }
  sendJson(res, 200, { publicKey: config.publicKey });
};
