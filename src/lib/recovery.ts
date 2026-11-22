import { EXERCISE_MAP } from "@/data/exercises";
import { MUSCLES } from "./stats";
import type { Muscle, Workout } from "./types";

export const RECOVERY_HOURS = 48;
const H = 3_600_000;

export type RecoveryStatus = "peak" | "active" | "rested";

export const RECOVERY_STYLE: Record<RecoveryStatus, { label: string; color: string; range: string }> = {
  peak: { label: "Peak Recovery", color: "#F59E0B", range: "Trained 0 to 24 hours ago" },
  active: { label: "Active Recovery", color: "#FBBF24", range: "Trained 24 to 48 hours ago" },
  rested: { label: "Fully Rested", color: "#10B981", range: "Over 48 hours since training" },
};

export interface MuscleRecovery {
  muscle: Muscle;
  status: RecoveryStatus;
  lastAt: string | null; // ISO time of the most recent completed set hitting this muscle
  hoursSince: number | null;
  hoursRemaining: number; // until fully rested (0 when rested)
  lastExerciseId: string | null;
}

/** Most recent completed set per muscle, counting primary and secondary movers, mapped to a 48-hour recovery state. */
export function muscleRecovery(workouts: Workout[], now: number): Record<Muscle, MuscleRecovery> {
  const last = new Map<Muscle, { t: number; exerciseId: string }>();
  for (const w of workouts) {
    const t = Date.parse(w.date);
    if (t > now) continue;
    for (const we of w.exercises) {
      const ex = EXERCISE_MAP[we.exerciseId];
      if (!ex || !we.sets.some((s) => s.done && s.reps > 0)) continue;
      for (const m of [...ex.primary, ...ex.secondary]) {
        const prev = last.get(m);
        if (!prev || t > prev.t) last.set(m, { t, exerciseId: ex.id });
      }
    }
  }
  const out = {} as Record<Muscle, MuscleRecovery>;
  for (const m of MUSCLES) {
    const hit = last.get(m);
    const hoursSince = hit ? (now - hit.t) / H : null;
    const status: RecoveryStatus = hoursSince === null || hoursSince >= RECOVERY_HOURS ? "rested" : hoursSince < 24 ? "peak" : "active";
    out[m] = {
      muscle: m,
      status,
      lastAt: hit ? new Date(hit.t).toISOString() : null,
      hoursSince,
      hoursRemaining: hoursSince === null ? 0 : Math.max(0, RECOVERY_HOURS - hoursSince),
      lastExerciseId: hit?.exerciseId ?? null,
    };
  }
  return out;
}
