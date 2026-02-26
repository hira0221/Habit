export type TimeSlot = "morning" | "noon" | "night";

export type Habit = {
  id: string;
  text: string;
  done: boolean;
  slot: TimeSlot;
};

export const STORAGE_KEYS = {
  habits: "habits",
  lastOpenedDate: "lastOpenedDate",
  streakCount: "streakCount",
  streakLastDate: "streakLastDate",
  rateHistoryByDate: "rateHistoryByDate",
  dailySnapshotByDate: "dailySnapshotByDate"
} as const;

export const TIME_SLOTS: ReadonlyArray<TimeSlot> = ["morning", "noon", "night"];

export function normalizeTimeSlot(slot: unknown): TimeSlot {
  if (slot === "morning" || slot === "noon" || slot === "night") return slot;
  return "morning";
}

export function sanitizeHabits(input: unknown): Habit[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const source = item as Partial<Habit> & { id?: string };
      const text = typeof source.text === "string" ? source.text.trim() : "";
      if (!text) return null;
      return {
        id: typeof source.id === "string" && source.id ? source.id : createHabitId(),
        text,
        done: !!source.done,
        slot: normalizeTimeSlot(source.slot)
      } satisfies Habit;
    })
    .filter((item): item is Habit => item !== null);
}

export function createHabitId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
