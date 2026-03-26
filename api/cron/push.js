const {
  currentDateKeyInTimezone,
  ensurePushConfigured,
  errorMessage,
  loadStore,
  normalizeSettings,
  normalizeTimezone,
  resolveDueSlot,
  saveStore,
  sendJson,
  sendPush,
  setNoStore,
  slotLabel
} = require("../_lib/push-core");

module.exports = async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    ensurePushConfigured();
    const store = await loadStore();
    if (!Array.isArray(store.subscriptions) || store.subscriptions.length === 0) {
      sendJson(res, 200, { ok: true, processed: 0, sent: 0 });
      return;
    }

    let sent = 0;
    let removed = 0;
    let dirty = false;

    for (const item of store.subscriptions.slice()) {
      const timezone = normalizeTimezone(item.timezone);
      const settings = normalizeSettings(item.settings);
      if (!settings.enabled) continue;

      const dueSlot = resolveDueSlot(settings, timezone, item.lastSentBySlot || {});
      if (!dueSlot) continue;

      try {
        await sendPush(item.subscription, {
          title: `${slotLabel(dueSlot)}の習慣チェック`,
          body: `今日の${slotLabel(dueSlot)}タスクを確認しましょう。`,
          tag: `habit-push-${dueSlot}`
        });
        item.lastSentBySlot = item.lastSentBySlot || {};
        item.lastSentBySlot[dueSlot] = currentDateKeyInTimezone(timezone);
        item.updatedAt = new Date().toISOString();
        sent += 1;
        dirty = true;
      } catch (err) {
        const status = err && err.statusCode;
        if (status === 404 || status === 410) {
          store.subscriptions = store.subscriptions.filter(entry => entry.clientId !== item.clientId);
          removed += 1;
          dirty = true;
        } else {
          console.warn(`Failed to send push to ${item.clientId}: ${errorMessage(err)}`);
        }
      }
    }

    if (dirty) {
      await saveStore(store);
    }

    sendJson(res, 200, {
      ok: true,
      processed: store.subscriptions.length,
      sent,
      removed
    });
  } catch (err) {
    sendJson(res, err.statusCode || 500, { error: err.message || "unknown error" });
  }
};
