import { create } from "zustand";

import { getDateKey } from "@/core/date-key";
import { computeNextStreakOnDayChange } from "@/core/streak";
import { createHabitId, Habit, TimeSlot } from "@/core/habit-model";
import { loadPersistedState, persistActiveSlot, persistDayMeta, persistHabits } from "@/core/storage";

type HabitsState = {
  initialized: boolean;
  habits: Habit[];
  activeSlot: TimeSlot;
  streakCount: number;
  streakLastDate: string;
  initialize: () => Promise<void>;
  addHabit: (text: string, slot: TimeSlot) => Promise<void>;
  toggleHabit: (id: string) => Promise<void>;
  setActiveSlot: (slot: TimeSlot) => Promise<void>;
};

export const useHabitsStore = create<HabitsState>((set, get) => ({
  initialized: false,
  habits: [],
  activeSlot: "morning",
  streakCount: 0,
  streakLastDate: "",

  initialize: async () => {
    if (get().initialized) return;

    const state = await loadPersistedState();
    const todayKey = getDateKey();
    let nextHabits = state.habits;
    let streakCount = state.streakCount;
    let streakLastDate = state.streakLastDate;

    if (state.lastOpenedDate && state.lastOpenedDate !== todayKey) {
      const wasPerfect = state.habits.length > 0 && state.habits.every(h => h.done);
      const nextStreak = computeNextStreakOnDayChange({
        todayKey,
        lastOpenedDate: state.lastOpenedDate,
        wasPerfect,
        streak: { count: state.streakCount, lastDate: state.streakLastDate }
      });

      streakCount = nextStreak.count;
      streakLastDate = nextStreak.lastDate;
      nextHabits = state.habits.map(h => ({ ...h, done: false }));

      await Promise.all([
        persistHabits(nextHabits),
        persistDayMeta({ lastOpenedDate: todayKey, streakCount, streakLastDate })
      ]);
    } else if (!state.lastOpenedDate) {
      await persistDayMeta({
        lastOpenedDate: todayKey,
        streakCount,
        streakLastDate
      });
    }

    set({
      initialized: true,
      habits: nextHabits,
      activeSlot: state.activeSlot,
      streakCount,
      streakLastDate
    });
  },

  addHabit: async (text, slot) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    const next = [...get().habits, { id: createHabitId(), text: cleanText, done: false, slot }];
    set({ habits: next });
    await persistHabits(next);
  },

  toggleHabit: async id => {
    const next = get().habits.map(h => (h.id === id ? { ...h, done: !h.done } : h));
    set({ habits: next });
    await persistHabits(next);
  },

  setActiveSlot: async slot => {
    set({ activeSlot: slot });
    await persistActiveSlot(slot);
  }
}));
