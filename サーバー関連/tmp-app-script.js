

const DATE_KEY = "lastOpenedDate";
const STORAGE_KEY = "habits";
const STREAK_COUNT_KEY = "streakCount";
const STREAK_LAST_DATE_KEY = "streakLastDate";
const RATE_HISTORY_KEY = "rateHistoryByDate";
const DAILY_SNAPSHOT_KEY = "dailySnapshotByDate";
const APP_STORAGE_KEYS = [
  STORAGE_KEY,
  DATE_KEY,
  STREAK_COUNT_KEY,
  STREAK_LAST_DATE_KEY,
  RATE_HISTORY_KEY,
  DAILY_SNAPSHOT_KEY
];
let habits = loadHabits();
let openedWrapper = null;
let isEditMode = false;
let reorderEnabled = false;

const appEl = document.querySelector(".app");
const listEl = document.getElementById("list");
const emptyHintEl = document.getElementById("emptyHint");
const dateEl = document.getElementById("date");
const streakEl = document.getElementById("streak");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const editBtn = document.getElementById("editBtn");
const progressSliderEl = document.getElementById("progressSlider");
const progressRingEl = document.getElementById("progressRing");
const ringValueEl = document.getElementById("ringValue");
const progressPercentEl = document.getElementById("progressPercent");
const historyPathEl = document.getElementById("historyPath");
const historyDotsEl = document.getElementById("historyDots");
const historyLabelsEl = document.getElementById("historyLabels");
const historyDetailEl = document.getElementById("historyDetail");
const historyDetailDateEl = document.getElementById("historyDetailDate");
const historyDetailRateEl = document.getElementById("historyDetailRate");
const historyDetailListEl = document.getElementById("historyDetailList");
const historyEmptyEl = document.getElementById("historyEmpty");
const progressDotRingEl = document.getElementById("progressDotRing");
const progressDotHistoryEl = document.getElementById("progressDotHistory");
const habitModalBackdropEl = document.getElementById("habitModalBackdrop");
const habitModalTitleEl = document.getElementById("habitModalTitle");
const habitModalInputEl = document.getElementById("habitModalInput");
const habitModalCancelEl = document.getElementById("habitModalCancel");
const habitModalSaveEl = document.getElementById("habitModalSave");
const confirmModalBackdropEl = document.getElementById("confirmModalBackdrop");
const confirmModalTitleEl = document.getElementById("confirmModalTitle");
const confirmModalMessageEl = document.getElementById("confirmModalMessage");
const confirmModalCancelEl = document.getElementById("confirmModalCancel");
const confirmModalOkEl = document.getElementById("confirmModalOk");
const importFileInputEl = document.getElementById("importFileInput");

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const APP_VERSION = "1.0.0";
let displayedRate = -1;
let selectedHistoryKey = "";
let currentProgressPage = 0;
let historyAnimationFrameId = null;
let currentHistoryPoints = null;
let onHabitModalSave = null;
let onConfirmResolve = null;
let confirmModalConfig = {
  allowBackdropClose: true,
  allowEscapeClose: true
};
let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;

ringValueEl.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
ringValueEl.style.strokeDashoffset = `${RING_CIRCUMFERENCE}`;

dateEl.textContent = new Date().toLocaleDateString("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "short"
});

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function openHabitModal(title, initialValue, onSave) {
  onHabitModalSave = onSave;
  habitModalTitleEl.textContent = title;
  habitModalInputEl.value = initialValue || "";
  habitModalBackdropEl.classList.add("show");
  habitModalBackdropEl.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    habitModalInputEl.focus();
    habitModalInputEl.select();
  }, 0);
}

function closeHabitModal() {
  habitModalInputEl.blur();
  habitModalBackdropEl.classList.remove("show");
  habitModalBackdropEl.setAttribute("aria-hidden", "true");
  onHabitModalSave = null;
}

function submitHabitModal() {
  if (typeof onHabitModalSave !== "function") {
    closeHabitModal();
    return;
  }
  const value = habitModalInputEl.value.trim();
  if (!value) return;
  onHabitModalSave(value);
  closeHabitModal();
}

function openConfirmModal({
  title = "確認",
  message = "",
  okText = "実行",
  cancelText = "キャンセル",
  showCancel = true,
  allowBackdropClose = true,
  allowEscapeClose = true
}) {
  confirmModalTitleEl.textContent = title;
  confirmModalMessageEl.textContent = message;
  confirmModalOkEl.textContent = okText;
  confirmModalCancelEl.textContent = cancelText;
  confirmModalCancelEl.hidden = !showCancel;
  confirmModalConfig = {
    allowBackdropClose,
    allowEscapeClose
  };
  confirmModalBackdropEl.classList.add("show");
  confirmModalBackdropEl.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    confirmModalOkEl.focus();
  }, 0);

  return new Promise(resolve => {
    onConfirmResolve = resolve;
  });
}

function closeConfirmModal(result) {
  confirmModalBackdropEl.classList.remove("show");
  confirmModalBackdropEl.setAttribute("aria-hidden", "true");
  if (typeof onConfirmResolve === "function") {
    onConfirmResolve(result);
  }
  onConfirmResolve = null;
  confirmModalCancelEl.hidden = false;
  confirmModalConfig = {
    allowBackdropClose: true,
    allowEscapeClose: true
  };
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function collectLocalStorageData() {
  const storageDump = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const raw = localStorage.getItem(key);
    storageDump[key] = safeParseJson(raw);
  }
  return storageDump;
}

function downloadJson(payload, filename) {
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportLocalStorageAsJson() {
  const storageDump = collectLocalStorageData();
  const payload = {
    appVersion: APP_VERSION,
    exportDate: new Date().toISOString(),
    data: storageDump
  };
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadJson(payload, `habit-export-${dateStamp}.json`);
  void openConfirmModal({
    title: "エクスポート完了",
    message: "エクスポートが完了しました。",
    okText: "OK",
    showCancel: false,
    allowBackdropClose: false,
    allowEscapeClose: false
  });
}

function backupCurrentDataBeforeImport() {
  const payload = {
    appVersion: APP_VERSION,
    exportDate: new Date().toISOString(),
    backupReason: "before-import-overwrite",
    data: collectLocalStorageData()
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadJson(payload, `habit-backup-before-import-${stamp}.json`);
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateImportPayload(payload) {
  if (!isPlainObject(payload)) {
    return { ok: false, message: "JSONのトップレベルがオブジェクトではありません。" };
  }
  if (typeof payload.appVersion !== "string" || !payload.appVersion.trim()) {
    return { ok: false, message: "appVersion がありません。" };
  }
  if (typeof payload.exportDate !== "string" || Number.isNaN(Date.parse(payload.exportDate))) {
    return { ok: false, message: "exportDate が不正です。" };
  }
  if (!isPlainObject(payload.data)) {
    return { ok: false, message: "data がオブジェクトではありません。" };
  }
  return { ok: true, message: "" };
}

function applyImportedData(data) {
  APP_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "string") {
      localStorage.setItem(key, value);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  });
}

async function handleImportPayload(payload) {
  const check = validateImportPayload(payload);
  if (!check.ok) {
    alert(`インポートエラー: ${check.message}`);
    return;
  }

  const shouldImport = await openConfirmModal({
    title: "インポート確認",
    message: `このデータを読み込みますか？\nappVersion: ${payload.appVersion}\nexportDate: ${payload.exportDate}\n現在のデータは上書きされます。`,
    okText: "読み込む",
    cancelText: "キャンセル"
  });
  if (!shouldImport) return;

  try {
    backupCurrentDataBeforeImport();
    applyImportedData(payload.data);
    habits = loadHabits();
    selectedHistoryKey = "";
    setEditMode(false);
    updateProgressDots();
    render();
    await openConfirmModal({
      title: "復元完了",
      message: "インポートが完了しました。",
      okText: "OK",
      showCancel: false,
      allowBackdropClose: false,
      allowEscapeClose: false
    });
  } catch (err) {
    alert(`インポートエラー: ${err instanceof Error ? err.message : "読み込みに失敗しました。"}`);
  }
}

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("habits の読み込みに失敗したため初期化します", err);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function parseDateKey(key) {
  if (!key) return null;
  const parts = key.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getPrevDateKey(key) {
  const d = parseDateKey(key);
  if (!d) return "";
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getStoredStreakCount() {
  const raw = localStorage.getItem(STREAK_COUNT_KEY);
  const count = Number.parseInt(raw || "0", 10);
  return Number.isNaN(count) ? 0 : Math.max(0, count);
}

function loadRateHistory() {
  try {
    const raw = localStorage.getItem(RATE_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    localStorage.removeItem(RATE_HISTORY_KEY);
    return {};
  }
}

function saveRateHistory(history) {
  const pruned = { ...history };
  const now = new Date();
  const oldest = new Date(now);
  oldest.setDate(oldest.getDate() - 35);
  const oldestTime = oldest.getTime();
  Object.keys(pruned).forEach(key => {
    const date = parseDateKey(key);
    if (!date || date.getTime() < oldestTime) {
      delete pruned[key];
    }
  });
  localStorage.setItem(RATE_HISTORY_KEY, JSON.stringify(pruned));
}

function writeDailyRateHistory(dateKey, rate) {
  if (!dateKey) return;
  const history = loadRateHistory();
  history[dateKey] = Math.max(0, Math.min(100, rate));
  saveRateHistory(history);
}

function loadDailySnapshots() {
  try {
    const raw = localStorage.getItem(DAILY_SNAPSHOT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    localStorage.removeItem(DAILY_SNAPSHOT_KEY);
    return {};
  }
}

function saveDailySnapshots(allSnapshots) {
  const pruned = { ...allSnapshots };
  const now = new Date();
  const oldest = new Date(now);
  oldest.setDate(oldest.getDate() - 35);
  const oldestTime = oldest.getTime();
  Object.keys(pruned).forEach(key => {
    const date = parseDateKey(key);
    if (!date || date.getTime() < oldestTime) {
      delete pruned[key];
    }
  });
  localStorage.setItem(DAILY_SNAPSHOT_KEY, JSON.stringify(pruned));
}

function buildSnapshotFromHabits(rate) {
  return {
    rate,
    habits: habits.map(h => ({ text: h.text, done: !!h.done }))
  };
}

function writeDailySnapshot(dateKey, rate) {
  if (!dateKey) return;
  const snapshots = loadDailySnapshots();
  snapshots[dateKey] = buildSnapshotFromHabits(rate);
  saveDailySnapshots(snapshots);
}

function getRecent7Days() {
  const out = [];
  const today = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const label = d.toLocaleDateString("ja-JP", { weekday: "short" });
    out.push({ key, label });
  }
  return out;
}

function buildSmoothPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` Q ${cx} ${prev.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function getHistoryChartData() {
  const history = loadRateHistory();
  const snapshots = loadDailySnapshots();
  const days = getRecent7Days();
  const minX = 16;
  const maxX = 264;
  const minY = 12;
  const maxY = 100;
  const stepX = (maxX - minX) / 6;
  const points = days.map((day, i) => {
    const rate = Number(history[day.key] ?? 0);
    const normalized = Math.max(0, Math.min(100, rate)) / 100;
    const x = minX + stepX * i;
    const y = maxY - normalized * (maxY - minY);
    return { x, y, rate };
  });
  return { history, snapshots, days, points, maxY };
}

function paintHistoryGraph(days, points, history, snapshots) {
  historyPathEl.setAttribute("d", buildSmoothPath(points));
  historyDotsEl.innerHTML = "";
  points.forEach((p, i) => {
    const day = days[i];
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hit.setAttribute("cx", String(p.x));
    hit.setAttribute("cy", String(p.y));
    hit.setAttribute("r", "12");
    hit.classList.add("dot-hit");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(p.x));
    circle.setAttribute("cy", String(p.y));
    circle.setAttribute("r", selectedHistoryKey === day.key ? "4.6" : "3.2");
    if (selectedHistoryKey === day.key) {
      circle.classList.add("active");
    }
    hit.addEventListener("click", () => {
      selectedHistoryKey = selectedHistoryKey === day.key ? "" : day.key;
      renderHistoryGraph();
    });
    historyDotsEl.appendChild(hit);
    historyDotsEl.appendChild(circle);
  });
  historyLabelsEl.innerHTML = days.map(day => `<span>${day.label}</span>`).join("");
  currentHistoryPoints = points.map(p => ({ ...p }));

  if (!selectedHistoryKey) {
    historyDetailEl.hidden = true;
    historyDetailListEl.innerHTML = "";
    historyEmptyEl.hidden = true;
    return;
  }

  historyDetailEl.hidden = false;
  const selectedDay = days.find(day => day.key === selectedHistoryKey) || days[days.length - 1];
  const selectedSnapshot = snapshots[selectedDay.key];
  const selectedRate = Number(
    history[selectedDay.key] ?? (selectedSnapshot ? selectedSnapshot.rate : 0)
  );
  historyDetailDateEl.textContent = selectedDay.key;
  historyDetailRateEl.textContent = `${selectedRate}%`;
  historyDetailListEl.innerHTML = "";

  if (!selectedSnapshot || !Array.isArray(selectedSnapshot.habits) || selectedSnapshot.habits.length === 0) {
    historyEmptyEl.hidden = false;
    return;
  }

  historyEmptyEl.hidden = true;
  selectedSnapshot.habits.forEach(item => {
    const li = document.createElement("li");
    li.className = "history-detail-item";
    const dot = document.createElement("span");
    dot.className = `status-dot ${item.done ? "done" : "todo"}`;
    const text = document.createElement("span");
    text.textContent = item.text;
    li.appendChild(dot);
    li.appendChild(text);
    historyDetailListEl.appendChild(li);
  });
}

function renderHistoryGraph() {
  const { history, snapshots, days, points } = getHistoryChartData();
  paintHistoryGraph(days, points, history, snapshots);
}

function animateHistoryGraphTransition() {
  const { history, snapshots, days, points: targetPoints } = getHistoryChartData();
  if (historyAnimationFrameId) {
    cancelAnimationFrame(historyAnimationFrameId);
    historyAnimationFrameId = null;
  }

  const hasBase =
    Array.isArray(currentHistoryPoints) &&
    currentHistoryPoints.length === targetPoints.length;
  const basePoints = hasBase
    ? currentHistoryPoints.map(p => ({ ...p }))
    : targetPoints.map(p => ({ ...p }));

  const delayPerPointMs = 30;
  const pointDurationMs = 220;
  const totalDurationMs = pointDurationMs + delayPerPointMs * (targetPoints.length - 1);
  let startTime = 0;

  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const frame = now => {
    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    const animatedPoints = targetPoints.map((target, i) => {
      const base = basePoints[i];
      const local = Math.max(0, Math.min(1, (elapsed - i * delayPerPointMs) / pointDurationMs));
      const eased = easeOutCubic(local);
      const goingUp = target.y < base.y;
      const overshoot = goingUp ? Math.sin(Math.PI * local) * 2.8 : 0;
      return {
        ...target,
        y: base.y + (target.y - base.y) * eased - overshoot
      };
    });

    paintHistoryGraph(days, animatedPoints, history, snapshots);

    if (elapsed < totalDurationMs) {
      historyAnimationFrameId = requestAnimationFrame(frame);
    } else {
      historyAnimationFrameId = null;
      paintHistoryGraph(days, targetPoints, history, snapshots);
    }
  };

  historyAnimationFrameId = requestAnimationFrame(frame);
}

function animateHistoryGraphFromZero() {
  const { history, snapshots, days, points: targetPoints, maxY } = getHistoryChartData();
  if (historyAnimationFrameId) {
    cancelAnimationFrame(historyAnimationFrameId);
    historyAnimationFrameId = null;
  }

  const delayPerPointMs = 55;
  const pointDurationMs = 300;
  const totalDurationMs = pointDurationMs + delayPerPointMs * (targetPoints.length - 1);
  let startTime = 0;

  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const frame = now => {
    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    const animatedPoints = targetPoints.map((target, i) => {
      const local = Math.max(0, Math.min(1, (elapsed - i * delayPerPointMs) / pointDurationMs));
      const eased = easeOutCubic(local);
      return {
        ...target,
        y: maxY + (target.y - maxY) * eased
      };
    });

    paintHistoryGraph(days, animatedPoints, history, snapshots);

    if (elapsed < totalDurationMs) {
      historyAnimationFrameId = requestAnimationFrame(frame);
    } else {
      historyAnimationFrameId = null;
      paintHistoryGraph(days, targetPoints, history, snapshots);
    }
  };

  historyAnimationFrameId = requestAnimationFrame(frame);
}

function isHistoryPageVisible() {
  const pageWidth = progressSliderEl.clientWidth || 1;
  return progressSliderEl.scrollLeft > pageWidth * 0.2;
}

function updateProgressDots() {
  const pageWidth = progressSliderEl.clientWidth || 1;
  const page = progressSliderEl.scrollLeft >= pageWidth / 2 ? 1 : 0;
  progressDotRingEl.classList.toggle("active", page === 0);
  progressDotHistoryEl.classList.toggle("active", page === 1);

  if (page !== currentProgressPage) {
    if (page === 1) {
      animateHistoryGraphFromZero();
    } else {
      if (historyAnimationFrameId) {
        cancelAnimationFrame(historyAnimationFrameId);
        historyAnimationFrameId = null;
      }
      if (selectedHistoryKey) {
        selectedHistoryKey = "";
      }
      renderHistoryGraph();
    }
    currentProgressPage = page;
  }
}

function setStoredStreak(count, lastDate) {
  localStorage.setItem(STREAK_COUNT_KEY, String(Math.max(0, count)));
  localStorage.setItem(STREAK_LAST_DATE_KEY, lastDate || "");
}

function isPerfectDay() {
  return habits.length > 0 && habits.every(h => h.done);
}

function updateStreakDisplay() {
  if (!isPerfectDay()) {
    streakEl.textContent = "";
    return;
  }

  const todayKey = getTodayKey();
  const storedCount = getStoredStreakCount();
  const storedLastDate = localStorage.getItem(STREAK_LAST_DATE_KEY) || "";
  const expectedPrev = getPrevDateKey(todayKey);
  const displayCount = storedLastDate === expectedPrev ? storedCount + 1 : 1;
  if (displayCount < 2) {
    streakEl.textContent = "";
    return;
  }
  streakEl.textContent = `${displayCount}日連続達成中`;
}

function resetHabitsIfNewDay() {
  const todayKey = getTodayKey();
  const lastDate = localStorage.getItem(DATE_KEY);
  if (lastDate === todayKey) return false;

  if (lastDate) {
    const done = habits.filter(h => h.done).length;
    const total = habits.length;
    const lastRate = total === 0 ? 0 : Math.round(done / total * 100);
    writeDailyRateHistory(lastDate, lastRate);
    writeDailySnapshot(lastDate, lastRate);

    const yesterdayKey = getPrevDateKey(todayKey);
    const isContinuousDay = lastDate === yesterdayKey;
    const wasPerfect = isPerfectDay();
    const storedCount = getStoredStreakCount();
    const storedLastDate = localStorage.getItem(STREAK_LAST_DATE_KEY) || "";
    if (!isContinuousDay) {
      setStoredStreak(0, "");
    } else if (wasPerfect) {
      const expectedPrev = getPrevDateKey(lastDate);
      const nextCount = storedLastDate === expectedPrev ? storedCount + 1 : 1;
      setStoredStreak(nextCount, lastDate);
    } else {
      setStoredStreak(0, "");
    }
  }

  habits.forEach(h => {
    h.done = false;
  });
  save();
  localStorage.setItem(DATE_KEY, todayKey);
  return true;
}

function moveHabit(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const [moved] = habits.splice(fromIndex, 1);
  habits.splice(toIndex, 0, moved);
}

function setEditMode(enabled) {
  isEditMode = enabled;
  reorderEnabled = enabled;
  appEl.classList.toggle("edit-mode", enabled);
  editBtn.textContent = enabled ? "完了" : "編集";
  closeOpened();
}

function updateRate() {
  const total = habits.length;
  const done = habits.filter(h => h.done).length;
  const rate = total === 0 ? 0 : Math.round(done / total * 100);
  const prevRate = displayedRate;
  writeDailyRateHistory(getTodayKey(), rate);
  writeDailySnapshot(getTodayKey(), rate);

  progressPercentEl.textContent = `${rate}%`;

  const ratio = Math.max(0, Math.min(1, rate / 100));
  const dashOffset = RING_CIRCUMFERENCE * (1 - ratio);
  ringValueEl.style.strokeDashoffset = `${dashOffset}`;
  ringValueEl.classList.toggle("complete", rate === 100);

  if (rate > displayedRate) {
    progressRingEl.classList.remove("animate");
    void progressRingEl.offsetWidth;
    progressRingEl.classList.add("animate");
  }
  displayedRate = rate;
  if (isHistoryPageVisible() && rate !== prevRate) {
    animateHistoryGraphTransition();
  } else {
    renderHistoryGraph();
  }

  updateStreakDisplay();
}

function closeOpened() {
  if (openedWrapper) {
    openedWrapper.classList.remove("swiped");
    openedWrapper = null;
  }
}

function render() {
  listEl.innerHTML = "";
  openedWrapper = null;
  let renderedCount = 0;

  habits.forEach((habit, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper";

    const deleteArea = document.createElement("div");
    deleteArea.className = "delete-area";
    deleteArea.textContent = "削除";
    deleteArea.addEventListener("click", () => {
      if (!isEditMode) return;
      habits.splice(index, 1);
      save();
      render();
    });

    const item = document.createElement("div");
    item.className = "item";
    if (habit.done) item.classList.add("done");

    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    dragHandle.textContent = "≡";

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = habit.text;

    const editItemBtn = document.createElement("button");
    editItemBtn.className = "edit-item-btn";
    editItemBtn.textContent = "編集";
    editItemBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (!isEditMode) return;
      openHabitModal("習慣を編集", habit.text, value => {
        habits[index].text = value;
        save();
        render();
      });
    });

    const checkArea = document.createElement("div");
    checkArea.className = "check-area";

    const check = document.createElement("div");
    check.className = "check";
    check.textContent = "✓";

    checkArea.appendChild(check);

    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let isSwipeGesture = false;
    let movedDuringTouch = false;
    let isDragging = false;
    let activePointerId = null;
    let dragStartY = 0;
    let dragFromIndex = index;
    let dragToIndex = index;
    let dragWrapperRefs = [];
    let dragMidPoints = [];
    let dragShiftAmount = 0;
    const dragGap = 8;

    const clearDragPreview = () => {
      dragWrapperRefs.forEach(w => {
        w.style.transform = "";
      });
    };

    const applyDragPreview = () => {
      clearDragPreview();
      if (!isDragging) return;
      if (dragToIndex > dragFromIndex) {
        for (let i = dragFromIndex + 1; i <= dragToIndex; i += 1) {
          dragWrapperRefs[i].style.transform = `translateY(${-dragShiftAmount}px)`;
        }
      } else if (dragToIndex < dragFromIndex) {
        for (let i = dragToIndex; i < dragFromIndex; i += 1) {
          dragWrapperRefs[i].style.transform = `translateY(${dragShiftAmount}px)`;
        }
      }
    };

    const resolveDropIndex = draggedCenterY => {
      let nextIndex = 0;
      for (let i = 0; i < dragMidPoints.length; i += 1) {
        if (draggedCenterY > dragMidPoints[i]) {
          nextIndex = i + 1;
        }
      }
      if (nextIndex > dragFromIndex) nextIndex -= 1;
      return Math.max(0, Math.min(habits.length - 1, nextIndex));
    };

    item.addEventListener("touchstart", e => {
      closeOpened();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      deltaX = 0;
      isSwipeGesture = false;
      movedDuringTouch = false;
    });

    item.addEventListener("touchmove", e => {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const dx = touchX - startX;
      const dy = touchY - startY;

      if (!isEditMode) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          movedDuringTouch = true;
        }
        return;
      }

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        isSwipeGesture = true;
        deltaX = dx;
        item.style.transform = `translateX(${Math.min(0, Math.max(dx, -72))}px)`;
      }
    }, { passive: false });

   item.addEventListener("touchend", () => {
  if (isEditMode) {
    item.style.transform = "";
    if (isSwipeGesture) {
      if (deltaX < -40) {
        wrapper.classList.add("swiped");
        openedWrapper = wrapper;
      } else {
        wrapper.classList.remove("swiped");
      }
    }
    return;
  }

  item.style.transform = "";
  if (movedDuringTouch) return;

  const wasDone = habits[index].done;
  habits[index].done = !habits[index].done;

  // 完了 -> 未完了
  if (wasDone) {
    save();
    render();
    return;
  }

  // 未完了 -> 完了（演出）
  item.classList.add("just-done");
  item.classList.add("done");
  setTimeout(() => {
    item.classList.remove("just-done");
    save();
    render();
  }, 300);
});

    dragHandle.addEventListener("pointerdown", e => {
      if (!reorderEnabled) return;
      e.preventDefault();
      closeOpened();
      isDragging = true;
      activePointerId = e.pointerId;
      dragStartY = e.clientY;
      dragFromIndex = index;
      dragToIndex = index;
      dragWrapperRefs = Array.from(listEl.querySelectorAll(".swipe-wrapper"));
      dragMidPoints = dragWrapperRefs.map(w => {
        const rect = w.getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
      dragShiftAmount = wrapper.offsetHeight + dragGap;
      wrapper.classList.add("drag-source");
      item.classList.add("dragging");
      item.style.transform = "translateY(0)";
      dragHandle.setPointerCapture(e.pointerId);
    });

    dragHandle.addEventListener("pointermove", e => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      e.preventDefault();
      const translateY = e.clientY - dragStartY;
      item.style.transform = `translateY(${translateY}px)`;
      const sourceRect = wrapper.getBoundingClientRect();
      const draggedCenterY = sourceRect.top + sourceRect.height / 2 + translateY;
      const nextDragToIndex = resolveDropIndex(draggedCenterY);
      dragToIndex = nextDragToIndex;
      applyDragPreview();
    });

    const finishDrag = e => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      isDragging = false;
      activePointerId = null;
      item.style.transform = "";
      clearDragPreview();
      wrapper.classList.remove("drag-source");
      item.classList.remove("dragging");
      if (dragToIndex !== dragFromIndex) {
        moveHabit(dragFromIndex, dragToIndex);
        save();
      }
      render();
    };

    dragHandle.addEventListener("pointerup", finishDrag);
    dragHandle.addEventListener("pointercancel", finishDrag);

    item.addEventListener("touchcancel", () => {
      item.style.transform = "";
      clearDragPreview();
      wrapper.classList.remove("drag-source");
      item.classList.remove("dragging");
    });

    item.appendChild(dragHandle);
    item.appendChild(text);
    item.appendChild(editItemBtn);
    item.appendChild(checkArea);
    wrapper.appendChild(deleteArea);
    wrapper.appendChild(item);
    listEl.appendChild(wrapper);
    renderedCount += 1;
  });

  emptyHintEl.classList.toggle("show", renderedCount === 0);
  updateRate();
}

document.getElementById("addBtn").addEventListener("click", () => {
  openHabitModal("習慣を追加", "", value => {
    habits.push({ text: value, done: false });
    save();
    render();
  });
});

exportBtn.addEventListener("click", async () => {
  const ok = await openConfirmModal({
    title: "エクスポート確認",
    message: "現在のデータをJSONでエクスポートしますか？",
    okText: "エクスポート",
    cancelText: "キャンセル"
  });
  if (!ok) return;
  exportLocalStorageAsJson();
});
importBtn.addEventListener("click", async () => {
  const ok = await openConfirmModal({
    title: "インポート確認",
    message: "インポートするJSONファイルを選択しますか？",
    okText: "ファイル選択へ",
    cancelText: "キャンセル"
  });
  if (!ok) return;
  importFileInputEl.value = "";
  importFileInputEl.click();
});

editBtn.addEventListener("click", () => {
  setEditMode(!isEditMode);
});

progressSliderEl.addEventListener("scroll", updateProgressDots, { passive: true });
window.addEventListener("resize", updateProgressDots);

habitModalCancelEl.addEventListener("click", closeHabitModal);
habitModalSaveEl.addEventListener("click", submitHabitModal);
habitModalBackdropEl.addEventListener("click", e => {
  if (e.target === habitModalBackdropEl) {
    closeHabitModal();
  }
});
habitModalInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    submitHabitModal();
  } else if (e.key === "Escape") {
    closeHabitModal();
  }
});

importFileInputEl.addEventListener("change", async e => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement) || !target.files || target.files.length === 0) {
    return;
  }
  const file = target.files[0];
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    await handleImportPayload(payload);
  } catch {
    alert("インポートエラー: 有効なJSONファイルではありません。");
  }
});

confirmModalCancelEl.addEventListener("click", () => closeConfirmModal(false));
confirmModalOkEl.addEventListener("click", () => closeConfirmModal(true));
confirmModalBackdropEl.addEventListener("click", e => {
  if (e.target === confirmModalBackdropEl && confirmModalConfig.allowBackdropClose) {
    closeConfirmModal(false);
  }
});
document.addEventListener("keydown", e => {
  if (!confirmModalBackdropEl.classList.contains("show")) return;
  if (e.key === "Escape" && confirmModalConfig.allowEscapeClose) {
    closeConfirmModal(false);
  }
});

if (resetHabitsIfNewDay()) {
  render();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && resetHabitsIfNewDay()) {
    render();
  }
});

setInterval(() => {
  if (document.visibilityState === "visible" && resetHabitsIfNewDay()) {
    render();
  }
}, 60 * 1000);

if (!isEditMode) {
  setEditMode(false);
}

render();
updateProgressDots();

if ("serviceWorker" in navigator) {
  const isLocalDevHost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (isLocalDevHost) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(err => {
        console.warn("Service Worker registration failed:", err);
      });
    });
  }
}

