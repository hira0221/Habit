const webpush = require("web-push");

const STORE_KEY = "habit_push_subscriptions";

function getVapidConfig() {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:admin@example.com"
  };
}

function ensurePushConfigured() {
  const config = getVapidConfig();
  if (!config.publicKey || !config.privateKey) {
    const error = new Error("Push server is not configured.");
    error.statusCode = 503;
    throw error;
  }
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return config;
}

function parseJsonBody(req) {
  if (!req || req.body == null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.body === "object") {
    return req.body;
  }
  return {};
}

function ensureClientId(input) {
  if (typeof input === "string" && input.trim()) {
    return input.trim();
  }
  return "";
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
    if (((lastSentBySlot || {})[slot.id] || "") === todayKey) continue;
    return slot.id;
  }
  return "";
}

function slotLabel(slot) {
  if (slot === "morning") return "朝";
  if (slot === "noon") return "昼";
  return "夜";
}

function sendPush(subscription, payload) {
  ensurePushConfigured();
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60
  });
}

function errorMessage(err) {
  if (!err) return "unknown error";
  if (typeof err === "string") return err;
  const parts = [];
  if (err.statusCode) {
    parts.push(`status ${err.statusCode}`);
  }
  if (typeof err.body === "string" && err.body.trim()) {
    parts.push(err.body.trim());
  }
  if (err.message) {
    parts.push(err.message);
  }
  if (parts.length > 0) {
    return parts.join(" / ");
  }
  return JSON.stringify(err);
}

async function loadStore() {
  if (hasKvConfig()) {
    return loadStoreFromKv();
  }
  throw storageConfigError();
}

async function saveStore(store) {
  if (hasKvConfig()) {
    await saveStoreToKv(store);
    return;
  }
  throw storageConfigError();
}

function storageConfigError() {
  const error = new Error("Push subscription store is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN on Vercel.");
  error.statusCode = 503;
  return error;
}

function hasKvConfig() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function loadStoreFromKv() {
  const response = await kvCommand(["GET", STORE_KEY]);
  const raw = response.result;
  if (!raw) {
    return { subscriptions: [] };
  }
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

async function saveStoreToKv(store) {
  await kvCommand(["SET", STORE_KEY, JSON.stringify(store)]);
}

async function kvCommand(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const error = new Error(data.error || `KV request failed (${response.status})`);
    error.statusCode = response.status || 500;
    throw error;
  }
  return data;
}

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

function numPart(parts, type) {
  const found = parts.find(p => p.type === type);
  return Number(found ? found.value : "0");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

module.exports = {
  currentDateKeyInTimezone,
  ensureClientId,
  ensurePushConfigured,
  errorMessage,
  getVapidConfig,
  isValidSubscription,
  loadStore,
  normalizeSettings,
  normalizeTimezone,
  parseJsonBody,
  resolveDueSlot,
  saveStore,
  sendJson,
  sendPush,
  setNoStore,
  slotLabel
};
