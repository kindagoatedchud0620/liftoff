export type Sex = "male" | "female";

export type Muscle =
  | "chest"
  | "frontDelts"
  | "rearDelts"
  | "lats"
  | "traps"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves";

export type Equipment = "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight";

/** Movement patterns that feed the Overall Liftoff Rank. */
export type Pattern =
  | "squat"
  | "hinge"
  | "horizontalPush"
  | "verticalPush"
  | "horizontalPull"
  | "verticalPull"
  | "arms"
  | "core"
  | "accessory";

export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  primary: Muscle[];
  secondary: Muscle[];
  pattern: Pattern;
  /** e1RM / bodyweight ratio that scores 1000 for a male lifter at reference bodyweight. Dumbbells are per hand. */
  elite: number;
  /** Fraction of bodyweight moved on top of added weight (pull-up = 1, push-up = 0.65). */
  bwFactor?: number;
}

export interface WorkoutSet {
  id: string;
  weight: number; // lb (added weight for bodyweight moves)
  reps: number;
  rpe?: number;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  date: string; // ISO timestamp
  name: string;
  exercises: WorkoutExercise[];
  durationMin?: number;
}

export interface Measurement {
  date: string; // ISO timestamp
  bodyweight: number; // lb
  bodyFat: number; // %
  waist: number; // in
  chest: number; // in
  biceps: number; // in
  thighs: number; // in
}

export interface Profile {
  name: string;
  sex: Sex;
  bodyweight: number; // lb
}

export type TierName =
  | "Wood"
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Champion"
  | "Titan"
  | "Olympian";

export interface Tier {
  name: TierName;
  index: number; // 0..8
  min: number;
  max: number;
  color: string;
}

export interface Rank {
  score: number; // 1..1000
  tier: Tier;
  lp: number; // 0..100 progress to next tier
}

/** A tier promotion shown by the rank-up overlay (an exercise or the Overall Liftoff Rank). */
export interface RankUpEvent {
  label: string;
  from: Rank;
  to: Rank;
  xp: number; // Experience Points the pet earns once the workout is finished
}
