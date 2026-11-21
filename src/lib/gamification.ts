import { EXERCISE_MAP } from "@/data/exercises";
import { byDate, prFeed, weekKey } from "./stats";
import type { Muscle, Profile, Workout } from "./types";

export const STREAK_WINDOW_H = 72;
const H = 3_600_000;

export interface StreakInfo {
  count: number; // distinct training days in the current chain
  best: number;
  alive: boolean;
  lastAt: string | null;
  hoursLeft: number; // until the streak breaks (0 when broken)
  revivable: boolean; // broken within the last 7 days and worth reviving
}

/**
 * A chain continues while consecutive points are <= 72h apart. A revive timestamp bridges
 * whatever gap precedes it, so a revived streak resumes with a fresh 72h buffer.
 */
export function computeStreak(workouts: Workout[], revives: string[], now: number): StreakInfo {
  const points = [
    ...workouts.map((w) => ({ t: Date.parse(w.date), revive: false })),
    ...revives.map((r) => ({ t: Date.parse(r), revive: true })),
  ].sort((a, b) => a.t - b.t);
  if (!points.length) return { count: 0, best: 0, alive: false, lastAt: null, hoursLeft: 0, revivable: false };

  const dayOf = (t: number) => new Date(t).toDateString();
  let chainDays = new Set<string>();
  let best = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const bridged = i > 0 && (p.revive || p.t - points[i - 1].t <= STREAK_WINDOW_H * H);
    if (!bridged) chainDays = new Set();
    if (!p.revive) chainDays.add(dayOf(p.t));
    best = Math.max(best, chainDays.size);
  }
  const last = points[points.length - 1].t;
  const hoursLeft = Math.max(0, STREAK_WINDOW_H - (now - last) / H);
  const alive = hoursLeft > 0;
  return {
    count: alive ? chainDays.size : 0,
    best,
    alive,
    lastAt: new Date(last).toISOString(),
    hoursLeft,
    revivable: !alive && chainDays.size >= 2 && now - (last + STREAK_WINDOW_H * H) < 7 * 24 * H,
  };
}

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface QuestDef {
  id: string;
  period: "daily" | "weekly";
  title: string;
  reward: number;
  target: number;
  progress: (ws: Workout[], profile: Profile) => number;
}

const doneSetsFor = (ws: Workout[], muscles: Muscle[]) =>
  ws.reduce(
    (n, w) =>
      n +
      w.exercises
        .filter((we) => EXERCISE_MAP[we.exerciseId]?.primary.some((m) => muscles.includes(m)))
        .reduce((k, we) => k + we.sets.filter((s) => s.done).length, 0),
    0,
  );

const allSets = (ws: Workout[]) => ws.reduce((n, w) => n + w.exercises.reduce((k, we) => k + we.sets.filter((s) => s.done).length, 0), 0);

export const QUESTS: QuestDef[] = [
  { id: "d-workout", period: "daily", title: "Complete a workout", reward: 10, target: 1, progress: (ws) => ws.length },
  { id: "d-chest", period: "daily", title: "Log 3 Chest sets", reward: 15, target: 3, progress: (ws) => doneSetsFor(ws, ["chest"]) },
  { id: "d-sets", period: "daily", title: "Log 12 total sets", reward: 15, target: 12, progress: allSets },
  { id: "w-pr", period: "weekly", title: "Hit a 1RM PR", reward: 40, target: 1, progress: () => 0 }, // filled in questProgress
  { id: "w-three", period: "weekly", title: "Log 3 workouts", reward: 50, target: 3, progress: (ws) => ws.length },
  { id: "w-back", period: "weekly", title: "Log 10 Back sets", reward: 25, target: 10, progress: (ws) => doneSetsFor(ws, ["lats", "traps", "rearDelts"]) },
  {
    id: "w-volume",
    period: "weekly",
    title: "Move 25,000 lb of volume",
    reward: 40,
    target: 25000,
    progress: (ws) => ws.reduce((n, w) => n + w.exercises.reduce((k, we) => k + we.sets.filter((s) => s.done).reduce((a, s) => a + s.weight * s.reps, 0), 0), 0),
  },
];

export interface QuestState {
  def: QuestDef;
  key: string; // questId:period, used to mark claims
  progress: number;
  complete: boolean;
  claimed: boolean;
}

export function questStates(workouts: Workout[], profile: Profile, claimed: string[], now: number): QuestState[] {
  const today = dayKey(now);
  const week = weekKey(new Date(now).toISOString());
  const todays = workouts.filter((w) => dayKey(Date.parse(w.date)) === today);
  const weeks = workouts.filter((w) => weekKey(w.date) === week);
  const weekPrs = prFeed([...workouts].sort(byDate), profile).filter((p) => p.kind === "e1rm" && weekKey(p.date) === week).length;
  return QUESTS.map((def) => {
    const key = `${def.id}:${def.period === "daily" ? today : week}`;
    const progress = def.id === "w-pr" ? weekPrs : def.progress(def.period === "daily" ? todays : weeks, profile);
    return { def, key, progress, complete: progress >= def.target, claimed: claimed.includes(key) };
  });
}

export interface ShopItem {
  id: string;
  kind: "revive" | "double" | "title";
  name: string;
  description: string;
  price: number;
}

export const SHOP: ShopItem[] = [
  { id: "streak-revive", kind: "revive", name: "Streak Revive", description: "Restore a streak that broke in the last 7 days.", price: 120 },
  { id: "double-egg", kind: "double", name: "Double Egg Shake", description: "2x Eggs on your next completed workout.", price: 60 },
  { id: "title-iron-novice", kind: "title", name: "Iron Novice", description: "Profile title for those who showed up.", price: 50 },
  { id: "title-gym-goblin", kind: "title", name: "Gym Goblin", description: "Lives at the rack. Fears no deload.", price: 90 },
  { id: "title-plateau-breaker", kind: "title", name: "Plateau Breaker", description: "Profile title for stubborn progress.", price: 150 },
  { id: "title-rack-royalty", kind: "title", name: "Rack Royalty", description: "Profile title with a crown on it.", price: 250 },
  { id: "title-olympian-contender", kind: "title", name: "Olympian Contender", description: "Profile title for the summit chasers.", price: 500 },
];

export const EGGS = { workout: 20, pr: 10, rankUp: 25 };
