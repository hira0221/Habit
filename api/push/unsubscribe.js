const {
  loadStore,
  parseJsonBody,
  saveStore,
  sendJson,
  setNoStore
} = require("../_lib/push-core");

module.exports = async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const body = parseJsonBody(req);
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    if (!clientId) {
      sendJson(res, 400, { error: "clientId is required." });
      return;
    }

    const store = await loadStore();
    const before = store.subscriptions.length;
    store.subscriptions = store.subscriptions.filter(item => item.clientId !== clientId);
    await saveStore(store);
    sendJson(res, 200, { ok: true, removed: before - store.subscriptions.length });
  } catch (err) {
    sendJson(res, err.statusCode || 500, { error: err.message || "unknown error" });
  }
};
