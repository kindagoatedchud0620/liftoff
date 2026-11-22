import { EXERCISE_MAP } from "@/data/exercises";
import { MAJOR_PATTERNS, byDate } from "./stats";
import { rankFromE1rm, rankFromScore, setE1rm } from "./ranking";
import type { Profile, Workout } from "./types";

export const DEFAULT_COMPANION_NAME = "Atlas";
/** Names offered by the Randomize Name button. */
export const COMPANION_NAMES = ["Atlas", "Ironpaw", "Titanus", "Barbellius", "Spotter", "Kilo", "Colossus", "Valkyrie", "Boulder", "Apex"];

/** Experience Points awarded to the pet. Derived from workout history, so it persists with the workouts. */
export const PET_XP = { workout: 40, record: 15, exerciseRankUp: 50, overallRankUp: 100 };

export interface PetStage {
  index: 0 | 1 | 2 | 3;
  name: string;
  minLevel: number;
  blurb: string;
}

export const PET_STAGES: PetStage[] = [
  { index: 0, name: "Rookie Cub", minLevel: 1, blurb: "Compact, wide eyed, and wearing a tiny sweatband." },
  { index: 1, name: "Iron Lifter", minLevel: 5, blurb: "Athletic stance, floating dumbbells, and a tier colored collar." },
  { index: 2, name: "Heavyweight Guardian", minLevel: 10, blurb: "Shoulder armor, a glowing chest core, and an orbiting energy ring." },
  { index: 3, name: "Olympian Titan", minLevel: 15, blurb: "Mythic aura, a floating golden crown, and twin starlight rings." },
];

/** Total Experience Points needed to reach `level` (level 1 needs 0). */
export const xpForLevel = (level: number) => Math.round(120 * Math.pow(Math.max(0, level - 1), 1.55));

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export const stageForLevel = (level: number): PetStage => [...PET_STAGES].reverse().find((s) => level >= s.minLevel)!;

export interface PetMilestone {
  id: string;
  date: string;
  text: string;
  xp: number;
}

export interface PetProgress {
  xp: number;
  level: number;
  stage: PetStage;
  levelStartXp: number;
  nextLevelXp: number;
  milestones: PetMilestone[]; // newest first
}

/** Replays history in order, awarding Experience Points for workouts, records and rank-ups. */
export function petProgress(workouts: Workout[], profile: Profile): PetProgress {
  const best: Record<string, number> = {};
  const score: Record<string, number> = {};
  const milestones: PetMilestone[] = [];
  let xp = 0;
  const overallTier = () => {
    const scores = MAJOR_PATTERNS.map((p) => Math.max(0, ...Object.keys(score).filter((id) => EXERCISE_MAP[id].pattern === p).map((id) => score[id]))).filter((s) => s > 0);
    return scores.length ? rankFromScore(scores.reduce((a, b) => a + b, 0) / scores.length).tier : null;
  };

  for (const w of [...workouts].sort(byDate)) {
    const before = overallTier();
    const award = (id: string, text: string, amount: number) => {
      xp += amount;
      milestones.push({ id: `${w.id}-${id}`, date: w.date, text, xp: amount });
    };
    award("workout", `Completed ${w.name}`, PET_XP.workout);

    const top: Record<string, number> = {};
    for (const we of w.exercises) {
      const ex = EXERCISE_MAP[we.exerciseId];
      if (!ex) continue;
      for (const s of we.sets) if (s.done && s.reps > 0) top[ex.id] = Math.max(top[ex.id] ?? 0, setE1rm(ex, s, profile.bodyweight));
    }
    for (const [id, e1rm] of Object.entries(top)) {
      const ex = EXERCISE_MAP[id];
      const prev = best[id];
      if (prev !== undefined && e1rm > prev) {
        award(`${id}-record`, `Personal Record on ${ex.name}`, PET_XP.record);
        const from = rankFromE1rm(ex, prev, profile.bodyweight, profile.sex).tier;
        const to = rankFromE1rm(ex, e1rm, profile.bodyweight, profile.sex).tier;
        if (to.index > from.index) award(`${id}-rank`, `${ex.name} ranked up to ${to.name}`, PET_XP.exerciseRankUp);
      }
      if (prev === undefined || e1rm > prev) {
        best[id] = e1rm;
        score[id] = rankFromE1rm(ex, e1rm, profile.bodyweight, profile.sex).score;
      }
    }
    const after = overallTier();
    if (before && after && after.index > before.index) award("overall", `Overall Liftoff Rank reached ${after.name}`, PET_XP.overallRankUp);
  }

  const level = levelFromXp(xp);
  return {
    xp,
    level,
    stage: stageForLevel(level),
    levelStartXp: xpForLevel(level),
    nextLevelXp: xpForLevel(level + 1),
    milestones: milestones.reverse(),
  };
}
