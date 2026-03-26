const {
  ensureClientId,
  ensurePushConfigured,
  isValidSubscription,
  loadStore,
  normalizeSettings,
  normalizeTimezone,
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
    ensurePushConfigured();
    const body = parseJsonBody(req);
    const clientId = ensureClientId(body.clientId);
    const subscription = body.subscription;
    const settings = normalizeSettings(body.settings);
    const timezone = normalizeTimezone(body.timezone);

    if (!clientId) {
      sendJson(res, 400, { error: "clientId is required." });
      return;
    }
    if (!isValidSubscription(subscription)) {
      sendJson(res, 400, { error: "Invalid push subscription payload." });
      return;
    }

    const store = await loadStore();
    const now = new Date().toISOString();
    const existing = store.subscriptions.find(item => item.clientId === clientId);
    const next = {
      clientId,
      timezone,
      settings,
      subscription,
      updatedAt: now
    };

    if (existing) {
      Object.assign(existing, next);
      existing.lastSentBySlot = existing.lastSentBySlot || {};
    } else {
      store.subscriptions.push({ ...next, createdAt: now, lastSentBySlot: {} });
    }

    await saveStore(store);
    sendJson(res, 200, { ok: true, clientId });
  } catch (err) {
    sendJson(res, err.statusCode || 500, { error: err.message || "unknown error" });
  }
};
