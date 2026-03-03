const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const webpush = require("web-push");

const app = express();
const PORT = Number(process.env.PORT || 4173);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "push-subscriptions.json");

loadDotEnv(path.join(ROOT_DIR, ".env"));

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn("Web Push keys are not set. Notifications API endpoints will return 503.");
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

app.use(express.json({ limit: "256kb" }));
app.use(express.static(ROOT_DIR));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get("/api/push/public-key", (_req, res) => {
  if (!vapidPublicKey) {
    res.status(503).json({ error: "VAPID key is not configured on server." });
    return;
  }
  res.json({ publicKey: vapidPublicKey });
});

app.post("/api/push/subscribe", (req, res) => {
  if (!vapidPublicKey || !vapidPrivateKey) {
    res.status(503).json({ error: "Push server is not configured." });
    return;
  }
  const body = req.body || {};
  const clientId = ensureClientId(body.clientId);
  const subscription = body.subscription;
  const settings = normalizeSettings(body.settings);
  const timezone = normalizeTimezone(body.timezone);

  if (!isValidSubscription(subscription)) {
    res.status(400).json({ error: "Invalid push subscription payload." });
    return;
  }

  const store = loadStore();
  const now = new Date().toISOString();
  const existing = store.subscriptions.find(s => s.clientId === clientId);
  const next = {
    clientId,
    timezone,
    settings,
    subscription,
    updatedAt: now
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    store.subscriptions.push({ ...next, createdAt: now, lastSentBySlot: {} });
  }

  saveStore(store);
  res.json({ ok: true, clientId });
});

app.post("/api/push/unsubscribe", (req, res) => {
  const body = req.body || {};
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  if (!clientId) {
    res.status(400).json({ error: "clientId is required." });
    return;
  }

  const store = loadStore();
  const before = store.subscriptions.length;
  store.subscriptions = store.subscriptions.filter(s => s.clientId !== clientId);
  saveStore(store);
  res.json({ ok: true, removed: before - store.subscriptions.length });
});

app.post("/api/push/test", async (req, res) => {
  if (!vapidPublicKey || !vapidPrivateKey) {
    res.status(503).json({ error: "Push server is not configured." });
    return;
  }
  const clientId = typeof req.body?.clientId === "string" ? req.body.clientId : "";
  const store = loadStore();
  const target = store.subscriptions.find(s => s.clientId === clientId);
  if (!target) {
    res.status(404).json({ error: "Subscription not found." });
    return;
  }
  try {
    await sendPush(target.subscription, {
      title: "習慣チェック",
      body: "テスト通知です。サーバー連携は有効です。",
      tag: "habit-push-test"
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

app.listen(PORT, () => {
  console.log(`PWA server listening on http://localhost:${PORT}`);
  startScheduleLoop();
});

function startScheduleLoop() {
  // Run once shortly after startup, then at a one-minute cadence.
  setTimeout(() => {
    void processScheduledPushes();
  }, 4000);
  setInterval(() => {
    void processScheduledPushes();
  }, 60 * 1000);
}

async function processScheduledPushes() {
  if (!vapidPublicKey || !vapidPrivateKey) return;
  const store = loadStore();
  if (!Array.isArray(store.subscriptions) || store.subscriptions.length === 0) return;

  let dirty = false;
  for (const item of store.subscriptions) {
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
      dirty = true;
    } catch (err) {
      // Remove dead subscriptions (410 Gone / 404 Not Found).
      const status = err && err.statusCode;
      if (status === 404 || status === 410) {
        store.subscriptions = store.subscriptions.filter(s => s.clientId !== item.clientId);
        dirty = true;
      } else {
        console.warn(`Failed to send push to ${item.clientId}: ${errorMessage(err)}`);
      }
    }
  }

  if (dirty) saveStore(store);
}

function resolveDueSlot(settings, timezone, lastSentBySlot) {
  const slots = [
    { id: "morning", time: settings.morning },
    { id: "noon", time: settings.noon },
    { id: "night", time: settings.night }
  ];
  const nowParts = getZonedTimeParts(timezone, new Date());
  const nowHm = `${pad2(nowParts.hour)}:${pad2(nowParts.minute)}`;
  const todayKey = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;

  for (const slot of slots) {
    if (slot.time !== nowHm) continue;
    if ((lastSentBySlot[slot.id] || "") === todayKey) continue;
    return slot.id;
  }
  return "";
}

function getZonedTimeParts(timezone, date) {
  const dtf = new Intl.DateTimeFormat("ja-JP", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = dtf.formatToParts(date);
  return {
    year: numPart(parts, "year"),
    month: numPart(parts, "month"),
    day: numPart(parts, "day"),
    hour: numPart(parts, "hour"),
    minute: numPart(parts, "minute"),
    second: numPart(parts, "second")
  };
}

function currentDateKeyInTimezone(timezone) {
  const p = getZonedTimeParts(timezone, new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

function numPart(parts, type) {
  const found = parts.find(p => p.type === type);
  return Number(found ? found.value : "0");
}

function ensureClientId(input) {
  return typeof input === "string" && input.trim() ? input.trim() : crypto.randomUUID();
}

function normalizeSettings(input) {
  const settings = input && typeof input === "object" ? input : {};
  return {
    enabled: !!settings.enabled,
    morning: normalizeTime(settings.morning, "08:00"),
    noon: normalizeTime(settings.noon, "12:00"),
    night: normalizeTime(settings.night, "21:00")
  };
}

function normalizeTime(value, fallback) {
  if (typeof value !== "string") return fallback;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? value : fallback;
}

function normalizeTimezone(value) {
  if (typeof value !== "string" || !value.trim()) return "Asia/Tokyo";
  try {
    new Intl.DateTimeFormat("ja-JP", { timeZone: value }).format();
    return value;
  } catch {
    return "Asia/Tokyo";
  }
}

function isValidSubscription(sub) {
  if (!sub || typeof sub !== "object") return false;
  if (typeof sub.endpoint !== "string" || !sub.endpoint) return false;
  if (!sub.keys || typeof sub.keys !== "object") return false;
  if (typeof sub.keys.auth !== "string" || typeof sub.keys.p256dh !== "string") return false;
  return true;
}

function slotLabel(slot) {
  if (slot === "morning") return "朝";
  if (slot === "noon") return "昼";
  return "夜";
}

function sendPush(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60
  });
}

function loadStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.subscriptions)) {
      return { subscriptions: [] };
    }
    return parsed;
  } catch {
    return { subscriptions: [] };
  }
}

function saveStore(store) {
  ensureStoreFile();
  fs.writeFileSync(SUBSCRIPTIONS_FILE, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify({ subscriptions: [] }, null, 2), "utf8");
  }
}

function errorMessage(err) {
  if (!err) return "unknown error";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  return JSON.stringify(err);
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index <= 0) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}
