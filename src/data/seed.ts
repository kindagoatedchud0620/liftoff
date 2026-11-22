import { EXERCISE_MAP } from "@/data/exercises";
import { e1rmForScore } from "@/lib/ranking";
import type { Measurement, Profile, Workout, WorkoutExercise, WorkoutSet } from "@/lib/types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const BW = 180;
const SEX = "male" as const;
const N_WORKOUTS = 48; // 12 weeks x 4 sessions

/** Small deterministic PRNG so the demo history is identical on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** final = score reached in the last training week; the session ramps from final - 100 up to it. */
interface Plan {
  id: string;
  final: number;
  reps: number; // top-set reps for loaded lifts; bodyweight moves derive reps from the target
  sets: number;
}
type Slot = Plan | { alt: [Plan, Plan] }; // alt rotates week to week, so both variants get trained
type DayType = "Push" | "Pull" | "Legs" | "Upper";

// Ordered so the last four sessions run Pull, Upper, Legs (32h ago), Push (14h ago): the recovery heatmap then shows
// pushing muscles at peak, legs in active recovery and pulling muscles (biceps, rear delts) fully rested on first load.
const DAY_TYPES: DayType[] = ["Pull", "Upper", "Legs", "Push"];

const TEMPLATES: Record<DayType, Slot[]> = {
  Push: [
    { id: "bench-press", final: 425, reps: 5, sets: 4 },
    { id: "overhead-press", final: 340, reps: 5, sets: 3 },
    { id: "incline-bench-press", final: 380, reps: 6, sets: 3 },
    { id: "lateral-raise", final: 300, reps: 12, sets: 3 },
    { id: "tricep-pushdown", final: 300, reps: 10, sets: 3 },
    { alt: [
      { id: "cable-fly", final: 340, reps: 10, sets: 3 },
      { id: "push-up", final: 340, reps: 6, sets: 3 },
    ] },
  ],
  Pull: [
    { id: "deadlift", final: 560, reps: 5, sets: 3 },
    { id: "pull-up", final: 460, reps: 4, sets: 4 },
    { alt: [
      { id: "barbell-row", final: 400, reps: 8, sets: 4 },
      { id: "t-bar-row", final: 380, reps: 8, sets: 4 },
    ] },
    { id: "lat-pulldown", final: 420, reps: 10, sets: 3 },
    { id: "face-pull", final: 300, reps: 13, sets: 3 },
    { alt: [
      { id: "barbell-curl", final: 250, reps: 10, sets: 3 },
      { id: "db-curl", final: 250, reps: 10, sets: 3 },
    ] },
  ],
  Legs: [
    { id: "back-squat", final: 520, reps: 5, sets: 4 },
    { id: "hip-thrust", final: 600, reps: 10, sets: 3 },
    { id: "romanian-deadlift", final: 500, reps: 8, sets: 3 },
    { id: "leg-curl", final: 330, reps: 10, sets: 3 },
    { alt: [
      { id: "leg-extension", final: 350, reps: 10, sets: 3 },
      { id: "leg-press", final: 450, reps: 10, sets: 3 },
    ] },
    { alt: [
      { id: "standing-calf-raise", final: 180, reps: 10, sets: 4 },
      { id: "seated-calf-raise", final: 180, reps: 10, sets: 4 },
    ] },
  ],
  Upper: [
    { id: "db-bench-press", final: 380, reps: 8, sets: 3 },
    { id: "chin-up", final: 440, reps: 5, sets: 4 },
    { id: "skull-crusher", final: 300, reps: 10, sets: 3 },
    { id: "hammer-curl", final: 255, reps: 10, sets: 3 },
    { id: "barbell-shrug", final: 350, reps: 10, sets: 3 },
    { id: "cable-crunch", final: 280, reps: 8, sets: 3 },
  ],
};

export function buildSeed(now: number): { workouts: Workout[]; measurements: Measurement[]; profile: Partial<Profile> } {
  const rnd = mulberry32(0x5eed1f7);

  // The latest session is 14h ago and the one before it 32h ago (Push then Legs). The session before that (Upper)
  // must sit more than 48h back so its muscles read as rested. Earlier sessions fall on a calendar template of
  // Tuesday, Thursday, Saturday and Sunday evenings: every week gets a weekend session and no gap exceeds about 50h.
  const latest = new Date(now - 14 * HOUR);
  const previous = new Date(now - 32 * HOUR);
  const cutoff = previous.getTime() - 17 * HOUR; // keeps the Upper session at least 49h before now, whatever weekday now is
  const monday = new Date(latest);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const template: Date[] = [];
  for (let w = 0; w < 14; w++) {
    for (const off of [1, 3, 5, 6]) {
      const d = new Date(monday);
      d.setDate(monday.getDate() - 7 * w + off);
      d.setHours(18 + Math.floor(rnd() * 2), Math.floor(rnd() * 60), 0, 0);
      if (d.getTime() < cutoff) template.push(d);
    }
  }
  template.sort((a, b) => a.getTime() - b.getTime());
  const dates: Date[] = [...template.slice(-(N_WORKOUTS - 2)), previous, latest];

  const seen = new Map<string, number>();

  /** Working sets for one plan entry. k is this exercise's occurrence index out of `total` sessions. */
  const buildSets = (plan: Plan, k: number, total: number, deload: number, workoutId: string): WorkoutSet[] => {
    const ex = EXERCISE_MAP[plan.id];
    const start = Math.max(1, plan.final - 100);
    const p = total > 1 ? k / (total - 1) : 1;
    let score = start + (plan.final - start) * p;
    if (p < 1) score *= 1 + (rnd() - 0.5) * 0.02;
    score = Math.min(plan.final, score);
    const top = 8 + Math.floor(rnd() * 5) * 0.5; // top sets run hotter, RPE 8 to 10
    const T = e1rmForScore(ex, score, BW, SEX) * deload;
    const bwLoad = (ex.bwFactor ?? 0) * BW;
    return Array.from({ length: plan.sets }, (_, j) => {
      const target = T * (1 - 0.05 * j);
      const rpe = Math.max(6, top - j);
      const id = `${workoutId}-${plan.id}-${j}`;
      if (bwLoad) {
        const reps = Math.max(1, Math.round(30 * (target / bwLoad - 1)));
        return { id, weight: 0, reps, rpe, done: true };
      }
      const weight = Math.max(5, Math.round(target / (1 + plan.reps / 30) / 5) * 5);
      return { id, weight, reps: plan.reps, rpe, done: true };
    });
  };

  const workouts: Workout[] = dates.map((date, i) => {
    const type = DAY_TYPES[i % 4];
    const week = Math.floor(i / 4);
    const deload = week === 7 ? 0.92 : 1; // week 8 is a lighter deload
    const id = `seed-${i}`;
    const exercises: WorkoutExercise[] = TEMPLATES[type].map((slot) => {
      const alt = "alt" in slot;
      const plan = alt ? slot.alt[week % 2] : slot;
      const k = seen.get(plan.id) ?? 0;
      seen.set(plan.id, k + 1);
      return { exerciseId: plan.id, sets: buildSets(plan, k, alt ? 6 : 12, deload, id) };
    });
    return {
      id,
      date: date.toISOString(),
      name: `${type} Day`,
      exercises,
      durationMin: 50 + Math.floor(rnd() * 20),
    };
  });

  const measurements: Measurement[] = Array.from({ length: 13 }, (_, k) => {
    const t = k / 12;
    const n = () => rnd() - 0.5;
    const r1 = (x: number) => Math.round(x * 10) / 10;
    return {
      date: new Date(now - (12 - k) * 7 * DAY).toISOString(),
      bodyweight: r1(clamp(176 + 5 * t + n() * 0.8, 176, 181)),
      bodyFat: r1(clamp(18 - 2.5 * t + n() * 0.4, 15.5, 18)),
      waist: r1(clamp(34 - 1.2 * t + n() * 0.2, 32.8, 34)),
      chest: r1(clamp(41 + 1.2 * t + n() * 0.3, 41, 42.2)),
      biceps: r1(clamp(15 + 0.6 * t + n() * 0.15, 15, 15.6)),
      thighs: r1(clamp(23.4 + 0.9 * t + n() * 0.2, 23.4, 24.3)),
    };
  });

  return {
    workouts,
    measurements,
    profile: { name: "Alex Rivera", sex: "male", bodyweight: 180 },
  };
}
