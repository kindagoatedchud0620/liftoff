import { STREAK_WINDOW_H } from "./gamification";
import { byDate, exerciseBests, muscleRanks, overallRank, MUSCLES } from "./stats";
import type { Profile, Workout } from "./types";

const H = 3_600_000;
const DAY = 24 * H;

interface Ctx {
  workouts: Workout[]; // sorted oldest first
  profile: Profile;
}

export interface TrophyDef {
  id: string;
  name: string;
  requirement: string;
  color: string; // medal metal color
  target: number;
  progress: (ctx: Ctx) => number;
  format: (progress: number, target: number) => string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const done = (w: Workout) => w.exercises.flatMap((we) => we.sets.filter((s) => s.done && s.reps > 0));

/** Longest run of consecutive weekends (Saturday or Sunday) with at least one workout. */
export function longestWeekendRun(workouts: Workout[]): number {
  const weekends = new Set<number>();
  for (const w of workouts) {
    const d = new Date(w.date);
    const day = d.getDay();
    if (day !== 0 && day !== 6) continue;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (day === 0 ? 1 : 0)); // key each weekend by its Saturday
    weekends.add(Math.round(d.getTime() / DAY));
  }
  let best = 0;
  for (const k of weekends) {
    if (weekends.has(k - 7)) continue; // only count from the start of a run
    let n = 1;
    while (weekends.has(k + 7 * n)) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** Longest span in days covered by a chain of workouts no more than 72 hours apart. */
export function longestStreakDays(workouts: Workout[]): number {
  const ts = workouts.map((w) => Date.parse(w.date)).sort((a, b) => a - b);
  let best = 0;
  let start = ts[0];
  for (let i = 0; i < ts.length; i++) {
    if (i > 0 && ts[i] - ts[i - 1] > STREAK_WINDOW_H * H) start = ts[i];
    best = Math.max(best, (ts[i] - start) / DAY);
  }
  return Math.floor(best);
}

export const TROPHIES: TrophyDef[] = [
  {
    id: "thousand-club",
    name: "1,000-Pound Club",
    requirement: "Combined Estimated One-Rep Max of Back Squat, Bench Press and Deadlift reaches 1,000 lb",
    color: "#FFD700",
    target: 1000,
    progress: ({ workouts, profile }) => {
      const b = exerciseBests(workouts, profile);
      return ["back-squat", "bench-press", "deadlift"].reduce((n, id) => n + (b[id]?.e1rm ?? 0), 0);
    },
    format: (p, t) => `${fmt(Math.min(p, t))} / ${fmt(t)} lb`,
  },
  {
    id: "symmetry-master",
    name: "Symmetry Master",
    requirement: "Every muscle group on the Bodygraph reaches Silver rank or higher",
    color: "#C0C0C0",
    target: MUSCLES.length,
    progress: ({ workouts, profile }) => {
      const bests = exerciseBests(workouts, profile);
      const ranks = muscleRanks(bests, overallRank(bests));
      return MUSCLES.filter((m) => (ranks[m].rank?.tier.index ?? -1) >= 2).length;
    },
    format: (p, t) => `${p} / ${t} Muscles at Silver or higher`,
  },
  {
    id: "weekend-warrior",
    name: "Weekend Warrior",
    requirement: "Log a workout on 4 consecutive weekends (Saturday or Sunday)",
    color: "#CD7F32",
    target: 4,
    progress: ({ workouts }) => longestWeekendRun(workouts),
    format: (p, t) => `${Math.min(p, t)} / ${t} consecutive weekends`,
  },
  {
    id: "heavy-metal-century",
    name: "Heavy Metal Century",
    requirement: "Lift 100,000 lb of total workout volume",
    color: "#38BDF8",
    target: 100_000,
    progress: ({ workouts }) => workouts.reduce((n, w) => n + done(w).reduce((v, s) => v + s.weight * s.reps, 0), 0),
    format: (p, t) => `${fmt(Math.min(p, t))} / ${fmt(t)} lb`,
  },
  {
    id: "apex-contender",
    name: "Apex Contender",
    requirement: "Reach Diamond rank or higher on any 3 exercises",
    color: "#818CF8",
    target: 3,
    progress: ({ workouts, profile }) => Object.values(exerciseBests(workouts, profile)).filter((b) => b.rank.tier.index >= 5).length,
    format: (p, t) => `${Math.min(p, t)} / ${t} exercises at Diamond or higher`,
  },
  {
    id: "unbreakable-consistency",
    name: "Unbreakable Consistency",
    requirement: "Keep a workout streak alive for 30 days, with no more than 72 hours between workouts",
    color: "#F43F5E",
    target: 30,
    progress: ({ workouts }) => longestStreakDays(workouts),
    format: (p, t) => `${Math.min(p, t)} / ${t} days`,
  },
];

export interface TrophyState {
  def: TrophyDef;
  progress: number;
  fraction: number; // 0..1
  unlocked: boolean;
  unlockedAt: string | null; // date of the workout that earned it
}

/**
 * Evaluates every feat against the full history; for unlocked ones, replays history to find the
 * first workout that met the target. Linear scan: muscle averages can dip, so progress is not monotonic.
 */
export function trophyStates(workouts: Workout[], profile: Profile): TrophyState[] {
  const sorted = [...workouts].sort(byDate);
  return TROPHIES.map((def) => {
    const progress = def.progress({ workouts: sorted, profile });
    const unlocked = progress >= def.target;
    let unlockedAt: string | null = null;
    if (unlocked) {
      const i = sorted.findIndex((_, k) => def.progress({ workouts: sorted.slice(0, k + 1), profile }) >= def.target);
      unlockedAt = sorted[i]?.date ?? null;
    }
    return { def, progress, fraction: Math.min(1, progress / def.target), unlocked, unlockedAt };
  });
}

/** Names of feats unlocked by adding `next` to `prev` history. */
export function newlyUnlocked(prev: Workout[], next: Workout[], profile: Profile): string[] {
  const before = new Set(trophyStates(prev, profile).filter((t) => t.unlocked).map((t) => t.def.id));
  return trophyStates(next, profile).filter((t) => t.unlocked && !before.has(t.def.id)).map((t) => t.def.name);
}

