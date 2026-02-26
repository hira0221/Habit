import { getPrevDateKey } from "@/core/date-key";

type StreakState = {
  count: number;
  lastDate: string;
};

export function computeDisplayStreak(todayKey: string, streak: StreakState, isPerfectDay: boolean) {
  if (!isPerfectDay) return 0;
  const expectedPrev = getPrevDateKey(todayKey);
  return streak.lastDate === expectedPrev ? streak.count + 1 : 1;
}

export function computeNextStreakOnDayChange(params: {
  todayKey: string;
  lastOpenedDate: string;
  wasPerfect: boolean;
  streak: StreakState;
}) {
  const { todayKey, lastOpenedDate, wasPerfect, streak } = params;
  const yesterdayKey = getPrevDateKey(todayKey);
  const isContinuousDay = lastOpenedDate === yesterdayKey;

  if (!isContinuousDay) {
    return { count: 0, lastDate: "" };
  }

  if (!wasPerfect) {
    return { count: 0, lastDate: "" };
  }

  const expectedPrev = getPrevDateKey(lastOpenedDate);
  const nextCount = streak.lastDate === expectedPrev ? streak.count + 1 : 1;
  return { count: nextCount, lastDate: lastOpenedDate };
}
