import { EXERCISE_MAP } from "@/data/exercises";
import { rankFromE1rm, rankFromScore, setE1rm } from "./ranking";
import type { Muscle, Pattern, Profile, Rank, Workout } from "./types";

// shortcut: all historical ranks use the current profile bodyweight; switch to measurement-at-date if users want time-accurate history.

export interface ExerciseBest {
  exerciseId: string;
  e1rm: number;
  weight: number;
  reps: number;
  date: string;
  rank: Rank;
}

export const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);

/** Only completed sets with real numbers count toward stats. */
function doneSets(w: Workout) {
  return w.exercises.flatMap((we) =>
    we.sets.filter((s) => s.done && s.reps > 0).map((s) => ({ exerciseId: we.exerciseId, set: s })),
  );
}

export function exerciseBests(workouts: Workout[], profile: Profile, before?: string): Record<string, ExerciseBest> {
  const out: Record<string, ExerciseBest> = {};
  for (const w of workouts) {
    if (before && w.date >= before) continue;
    for (const { exerciseId, set } of doneSets(w)) {
      const ex = EXERCISE_MAP[exerciseId];
      if (!ex) continue;
      const e1rm = setE1rm(ex, set, profile.bodyweight);
      if (!out[exerciseId] || e1rm > out[exerciseId].e1rm) {
        out[exerciseId] = {
          exerciseId,
          e1rm,
          weight: set.weight,
          reps: set.reps,
          date: w.date,
          rank: rankFromE1rm(ex, e1rm, profile.bodyweight, profile.sex),
        };
      }
    }
  }
  return out;
}

export const MAJOR_PATTERNS: Pattern[] = ["squat", "hinge", "horizontalPush", "verticalPush", "horizontalPull", "verticalPull"];

/** Overall Liftoff Rank: average of the best score in each major movement pattern the user has trained. */
export function overallRank(bests: Record<string, ExerciseBest>): Rank | null {
  const scores = MAJOR_PATTERNS.map((p) =>
    Math.max(0, ...Object.values(bests).filter((b) => EXERCISE_MAP[b.exerciseId].pattern === p).map((b) => b.rank.score)),
  ).filter((s) => s > 0);
  if (!scores.length) return null;
  return rankFromScore(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export interface MuscleRank {
  muscle: Muscle;
  rank: Rank | null;
  topExerciseId: string | null;
  exerciseIds: string[];
  status: "strong" | "lagging" | "balanced" | "untrained";
}

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: "Chest",
  frontDelts: "Front/Side Delts",
  rearDelts: "Rear Delts",
  lats: "Lats/Upper Back",
  traps: "Traps",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs/Core",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
};

export const MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[];

/** Average rank of the exercises that target each muscle as a primary mover. */
export function muscleRanks(bests: Record<string, ExerciseBest>, overall: Rank | null): Record<Muscle, MuscleRank> {
  const out = {} as Record<Muscle, MuscleRank>;
  for (const m of MUSCLES) {
    const list = Object.values(bests).filter((b) => EXERCISE_MAP[b.exerciseId].primary.includes(m));
    if (!list.length) {
      out[m] = { muscle: m, rank: null, topExerciseId: null, exerciseIds: [], status: "untrained" };
      continue;
    }
    const avg = list.reduce((a, b) => a + b.rank.score, 0) / list.length;
    const top = list.reduce((a, b) => (b.rank.score > a.rank.score ? b : a));
    const rank = rankFromScore(avg);
    const diff = overall ? rank.score - overall.score : 0;
    out[m] = {
      muscle: m,
      rank,
      topExerciseId: top.exerciseId,
      exerciseIds: list.map((b) => b.exerciseId),
      status: diff >= 60 ? "strong" : diff <= -60 ? "lagging" : "balanced",
    };
  }
  return out;
}

export const RADAR_GROUPS: Record<string, Muscle[]> = {
  Chest: ["chest"],
  Back: ["lats", "traps", "rearDelts"],
  Shoulders: ["frontDelts", "rearDelts"],
  Arms: ["biceps", "triceps", "forearms"],
  Core: ["abs"],
  Legs: ["quads", "hamstrings", "glutes", "calves"],
};

export function radarData(muscles: Record<Muscle, MuscleRank>) {
  return Object.entries(RADAR_GROUPS).map(([group, ms]) => {
    const scores = ms.map((m) => muscles[m].rank?.score ?? 0).filter((s) => s > 0);
    return { group, score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0 };
  });
}

/** Best e1RM per workout for one exercise, oldest first. */
export function e1rmHistory(workouts: Workout[], exerciseId: string, profile: Profile) {
  const ex = EXERCISE_MAP[exerciseId];
  const out: { date: string; e1rm: number }[] = [];
  for (const w of [...workouts].sort(byDate)) {
    const best = Math.max(0, ...doneSets(w).filter((d) => d.exerciseId === exerciseId).map((d) => setE1rm(ex, d.set, profile.bodyweight)));
    if (best > 0) out.push({ date: w.date, e1rm: Math.round(best) });
  }
  return out;
}

/** Monday 00:00 local of the week containing iso, as YYYY-MM-DD. */
export function weekKey(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Overall score at the end of each training week. */
export function overallHistory(workouts: Workout[], profile: Profile) {
  const sorted = [...workouts].sort(byDate);
  const weeks = [...new Set(sorted.map((w) => weekKey(w.date)))];
  return weeks.map((week) => {
    const end = new Date(week);
    end.setDate(end.getDate() + 7);
    const upTo = sorted.filter((w) => new Date(w.date) < end);
    return { week, score: overallRank(exerciseBests(upTo, profile))?.score ?? 0 };
  });
}

/** Weekly tonnage (weight x reps over completed sets) and average RPE. */
export function weeklyVolume(workouts: Workout[]) {
  const map = new Map<string, { tonnage: number; rpeSum: number; rpeN: number; sets: number }>();
  for (const w of workouts) {
    const k = weekKey(w.date);
    const e = map.get(k) ?? { tonnage: 0, rpeSum: 0, rpeN: 0, sets: 0 };
    for (const { set } of doneSets(w)) {
      e.tonnage += set.weight * set.reps;
      e.sets += 1;
      if (set.rpe) {
        e.rpeSum += set.rpe;
        e.rpeN += 1;
      }
    }
    map.set(k, e);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, e]) => ({ week, tonnage: Math.round(e.tonnage), sets: e.sets, avgRpe: e.rpeN ? +(e.rpeSum / e.rpeN).toFixed(1) : null }));
}

export interface PrEvent {
  id: string;
  date: string;
  exerciseId: string;
  kind: "e1rm" | "volume";
  value: number;
  previous: number;
  rankUp: { from: Rank; to: Rank } | null;
}

/** Walks history in order and emits e1RM and single-set volume PRs (first exposure to an exercise is not a PR). */
export function prFeed(workouts: Workout[], profile: Profile): PrEvent[] {
  const bestE: Record<string, number> = {};
  const bestV: Record<string, number> = {};
  const out: PrEvent[] = [];
  for (const w of [...workouts].sort(byDate)) {
    const wE: Record<string, number> = {};
    const wV: Record<string, number> = {};
    for (const { exerciseId, set } of doneSets(w)) {
      const ex = EXERCISE_MAP[exerciseId];
      if (!ex) continue;
      wE[exerciseId] = Math.max(wE[exerciseId] ?? 0, setE1rm(ex, set, profile.bodyweight));
      wV[exerciseId] = Math.max(wV[exerciseId] ?? 0, set.weight * set.reps);
    }
    for (const id of Object.keys(wE)) {
      const ex = EXERCISE_MAP[id];
      const prevE = bestE[id];
      if (prevE !== undefined && wE[id] > prevE) {
        const from = rankFromE1rm(ex, prevE, profile.bodyweight, profile.sex);
        const to = rankFromE1rm(ex, wE[id], profile.bodyweight, profile.sex);
        out.push({ id: `${w.id}-${id}-e`, date: w.date, exerciseId: id, kind: "e1rm", value: Math.round(wE[id]), previous: Math.round(prevE), rankUp: to.tier.index > from.tier.index ? { from, to } : null });
      }
      if (bestV[id] !== undefined && wV[id] > bestV[id]) {
        out.push({ id: `${w.id}-${id}-v`, date: w.date, exerciseId: id, kind: "volume", value: wV[id], previous: bestV[id], rankUp: null });
      }
      bestE[id] = Math.max(prevE ?? 0, wE[id]);
      bestV[id] = Math.max(bestV[id] ?? 0, wV[id]);
    }
  }
  return out.reverse();
}
