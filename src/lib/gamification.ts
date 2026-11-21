import type { Workout } from "./types";

export const STREAK_WINDOW_H = 72;
const H = 3_600_000;

export interface StreakInfo {
  count: number; // distinct training days in the current chain
  best: number;
  alive: boolean;
  lastAt: string | null;
  hoursLeft: number; // until the streak breaks (0 when broken)
}

/** A chain continues while consecutive workouts are no more than 72 hours apart. */
export function computeStreak(workouts: Workout[], now: number): StreakInfo {
  const points = workouts.map((w) => Date.parse(w.date)).sort((a, b) => a - b);
  if (!points.length) return { count: 0, best: 0, alive: false, lastAt: null, hoursLeft: 0 };

  const dayOf = (t: number) => new Date(t).toDateString();
  let chainDays = new Set<string>();
  let best = 0;
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || points[i] - points[i - 1] > STREAK_WINDOW_H * H) chainDays = new Set();
    chainDays.add(dayOf(points[i]));
    best = Math.max(best, chainDays.size);
  }
  const last = points[points.length - 1];
  const hoursLeft = Math.max(0, STREAK_WINDOW_H - (now - last) / H);
  const alive = hoursLeft > 0;
  return {
    count: alive ? chainDays.size : 0,
    best,
    alive,
    lastAt: new Date(last).toISOString(),
    hoursLeft,
  };
}
