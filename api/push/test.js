const {
  errorMessage,
  ensurePushConfigured,
  loadStore,
  parseJsonBody,
  saveStore,
  sendJson,
  sendPush,
  setNoStore
} = require("../_lib/push-core");

module.exports = async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    ensurePushConfigured();
    const body = parseJsonBody(req);
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const store = await loadStore();
    const target = store.subscriptions.find(item => item.clientId === clientId);

    if (!target) {
      sendJson(res, 404, { error: "Subscription not found." });
      return;
    }

    try {
      await sendPush(target.subscription, {
        title: "習慣チェック",
        body: "テスト通知です。サーバー連携は有効です。",
        tag: "habit-push-test"
      });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      const status = err && err.statusCode;
      if (status === 404 || status === 410) {
        store.subscriptions = store.subscriptions.filter(item => item.clientId !== clientId);
        await saveStore(store);
      }
      sendJson(res, 500, { error: errorMessage(err) });
    }
  } catch (err) {
    sendJson(res, err.statusCode || 500, { error: err.message || "unknown error" });
  }
};
