import type { Exercise, Rank, Sex, Tier, TierName, WorkoutSet } from "./types";

const TIER_DEFS: [TierName, string][] = [
  ["Wood", "#8B5A2B"],
  ["Bronze", "#CD7F32"],
  ["Silver", "#C0C0C0"],
  ["Gold", "#FFD700"],
  ["Platinum", "#38BDF8"],
  ["Diamond", "#818CF8"],
  ["Champion", "#F43F5E"],
  ["Titan", "#F97316"],
  ["Olympian", "#EAB308"],
];

/** 9 tiers, 110 points each; Olympian runs 881..1000. */
export const TIERS: Tier[] = TIER_DEFS.map(([name, color], i) => ({
  name,
  color,
  index: i,
  min: i * 110 + 1,
  max: i === 8 ? 1000 : (i + 1) * 110,
}));

export const MAX_SCORE = 1000;
/** Input bounds: stops typos like 3150 lb from becoming permanent records and rank inflation. */
export const LIMITS = { maxWeight: 2000, maxReps: 100, minBodyweight: 50, maxBodyweight: 700, maxBodyFat: 70, maxDurationMin: 240 };
const REF_BW: Record<Sex, number> = { male: 180, female: 140 };
// Female elite ratios relative to male standards.
const SEX_FACTOR: Record<Sex, { upper: number; lower: number }> = {
  male: { upper: 1, lower: 1 },
  female: { upper: 0.6, lower: 0.72 },
};
// Score curve: score = 1000 * (ratio / elite) ^ CURVE. 1.5 puts a 1.25x bodyweight bench near Gold.
const CURVE = 1.5;

/** Epley estimated 1RM; a single is taken at face value. */
export function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/** Total load moved in a set, adding the bodyweight share for bodyweight moves. */
export function setLoad(ex: Exercise, weight: number, bodyweight: number): number {
  return weight + (ex.bwFactor ?? 0) * bodyweight;
}

export function setE1rm(ex: Exercise, set: Pick<WorkoutSet, "weight" | "reps">, bodyweight: number): number {
  return epley(setLoad(ex, set.weight, bodyweight), set.reps);
}

function isLower(ex: Exercise): boolean {
  return ex.pattern === "squat" || ex.pattern === "hinge" || ex.primary.some((m) => ["quads", "hamstrings", "glutes", "calves"].includes(m));
}

/** Elite e1RM (score 1000) in lb for this lifter, using allometric bodyweight scaling (strength ~ bw^2/3). */
function eliteLoad(ex: Exercise, bodyweight: number, sex: Sex): number {
  const ref = REF_BW[sex];
  const sexK = isLower(ex) ? SEX_FACTOR[sex].lower : SEX_FACTOR[sex].upper;
  return ex.elite * sexK * ref * Math.pow(bodyweight / ref, 2 / 3);
}

export function scoreFromE1rm(ex: Exercise, e1rm: number, bodyweight: number, sex: Sex): number {
  if (e1rm <= 0) return 1;
  const raw = MAX_SCORE * Math.pow(e1rm / eliteLoad(ex, bodyweight, sex), CURVE);
  return Math.max(1, Math.min(MAX_SCORE, Math.round(raw)));
}

/** Inverse of scoreFromE1rm: the e1RM needed to reach a given score. */
export function e1rmForScore(ex: Exercise, score: number, bodyweight: number, sex: Sex): number {
  return eliteLoad(ex, bodyweight, sex) * Math.pow(score / MAX_SCORE, 1 / CURVE);
}

export function tierOf(score: number): Tier {
  const s = Math.max(1, Math.min(MAX_SCORE, Math.round(score)));
  return TIERS.find((t) => s >= t.min && s <= t.max) ?? TIERS[0];
}

/** LP: 0..100 progress through the current tier toward the next. */
export function rankFromScore(score: number): Rank {
  const s = Math.max(1, Math.min(MAX_SCORE, Math.round(score)));
  const tier = tierOf(s);
  const lp = Math.min(100, Math.floor(((s - tier.min) / (tier.max - tier.min + 1)) * 100));
  return { score: s, tier, lp: tier.index === 8 && s === MAX_SCORE ? 100 : lp };
}

export function rankFromE1rm(ex: Exercise, e1rm: number, bodyweight: number, sex: Sex): Rank {
  return rankFromScore(scoreFromE1rm(ex, e1rm, bodyweight, sex));
}

export function nextTier(tier: Tier): Tier | null {
  return TIERS[tier.index + 1] ?? null;
}
