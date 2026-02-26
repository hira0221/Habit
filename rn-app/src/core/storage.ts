import AsyncStorage from "@react-native-async-storage/async-storage";

import { Habit, sanitizeHabits, STORAGE_KEYS, TimeSlot } from "@/core/habit-model";

type PersistedState = {
  habits: Habit[];
  lastOpenedDate: string;
  streakCount: number;
  streakLastDate: string;
  activeSlot: TimeSlot;
};

const ACTIVE_SLOT_KEY = "activeTimeSlot";

export async function loadPersistedState(): Promise<PersistedState> {
  const [habitsRaw, lastOpenedDate, streakCountRaw, streakLastDate, activeSlot] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.habits),
    AsyncStorage.getItem(STORAGE_KEYS.lastOpenedDate),
    AsyncStorage.getItem(STORAGE_KEYS.streakCount),
    AsyncStorage.getItem(STORAGE_KEYS.streakLastDate),
    AsyncStorage.getItem(ACTIVE_SLOT_KEY)
  ]);

  return {
    habits: sanitizeHabits(parseJson(habitsRaw, [])),
    lastOpenedDate: typeof lastOpenedDate === "string" ? lastOpenedDate : "",
    streakCount: toSafeInt(streakCountRaw),
    streakLastDate: typeof streakLastDate === "string" ? streakLastDate : "",
    activeSlot: activeSlot === "noon" || activeSlot === "night" ? activeSlot : "morning"
  };
}

export async function persistHabits(habits: Habit[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(habits));
}

export async function persistActiveSlot(slot: TimeSlot) {
  await AsyncStorage.setItem(ACTIVE_SLOT_KEY, slot);
}

export async function persistDayMeta(input: { lastOpenedDate: string; streakCount: number; streakLastDate: string }) {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.lastOpenedDate, input.lastOpenedDate),
    AsyncStorage.setItem(STORAGE_KEYS.streakCount, String(Math.max(0, input.streakCount))),
    AsyncStorage.setItem(STORAGE_KEYS.streakLastDate, input.streakLastDate || "")
  ]);
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toSafeInt(raw: string | null) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
