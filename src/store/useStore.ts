"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed } from "@/data/seed";
import { EXERCISE_MAP } from "@/data/exercises";
import { DEFAULT_COMPANION_NAME, petProgress } from "@/lib/pet";
import { newlyUnlocked } from "@/lib/trophies";
import type { ArenaId } from "@/lib/arenas";
import { LIMITS, rankFromE1rm, rankFromScore, setE1rm } from "@/lib/ranking";
import { exerciseBests, overallRank } from "@/lib/stats";
import type { Measurement, Profile, Workout, WorkoutSet } from "@/lib/types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export interface FinishResult {
  workout: Workout; // the saved session, completed sets only
  newTrophies: string[]; // names of feats this session unlocked
  xp: number;
  records: number;
  rankUps: number;
  overallRankUp: boolean;
  levelBefore: number;
  levelAfter: number;
}

export interface State {
  seeded: boolean;
  profile: Profile;
  companionName: string;
  /** Training arena the user picked; null follows the best unlocked arena. */
  arenaId: ArenaId | null;
  workouts: Workout[];
  measurements: Measurement[];
  active: Workout | null;
  rest: { endsAt: number | null; duration: number };

  seed: () => void;
  clearData: () => void;
  /** Replaces all data from an exported backup. Returns false (and changes nothing) if it is not a valid backup. */
  importData: (raw: unknown) => boolean;
  deleteWorkout: (id: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
  /** Returns false (and changes nothing) unless the trimmed name is 1 to 24 characters. */
  setCompanionName: (name: string) => boolean;
  setArena: (id: ArenaId | null) => void;
  addMeasurement: (m: Measurement) => void;

  startWorkout: () => void;
  addExercise: (exerciseId: string) => void;
  removeExercise: (exIdx: number) => void;
  addSet: (exIdx: number) => void;
  removeSet: (exIdx: number, setIdx: number) => void;
  updateSet: (exIdx: number, setIdx: number, patch: Partial<WorkoutSet>) => void;
  finishWorkout: () => FinishResult | null;
  discardWorkout: () => void;

  startRest: (seconds?: number) => void;
  adjustRest: (deltaSeconds: number) => void;
  stopRest: () => void;
}

const DEFAULT_PROFILE: Profile = { name: "Athlete", sex: "male", bodyweight: 180 };

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patchActive = (fn: (w: Workout) => Workout) => {
        const a = get().active;
        if (a) set({ active: fn(a) });
      };
      return {
        seeded: false,
        profile: DEFAULT_PROFILE,
        companionName: DEFAULT_COMPANION_NAME,
        arenaId: null,
        workouts: [],
        measurements: [],
        active: null,
        rest: { endsAt: null, duration: 90 },

        seed: () => {
          const { workouts, measurements, profile } = buildSeed(Date.now());
          set({ seeded: true, workouts, measurements, profile: { ...DEFAULT_PROFILE, ...profile } });
        },
        clearData: () => set({ seeded: true, workouts: [], measurements: [], active: null }),
        importData: (raw) => {
          const o = (raw as { state?: unknown } | null)?.state;
          if (!o || typeof o !== "object" || !Array.isArray((o as State).workouts)) return false;
          const { workouts, measurements, profile, companionName, arenaId } = migrateState(o);
          set({ seeded: true, workouts, measurements, profile, companionName, arenaId, active: null });
          return true;
        },
        deleteWorkout: (id) => set({ workouts: get().workouts.filter((w) => w.id !== id) }),
        updateProfile: (p) => set({ profile: { ...get().profile, ...p } }),
        setArena: (id) => set({ arenaId: id }),
        setCompanionName: (name) => {
          const clean = name.trim().replace(/\s+/g, " ");
          if (clean.length < 1 || clean.length > 24) return false;
          set({ companionName: clean });
          return true;
        },
        addMeasurement: (m) => {
          // One entry per day: a second save on the same date replaces the first.
          const measurements = [...get().measurements.filter((x) => x.date !== m.date), m].sort((a, b) => a.date.localeCompare(b.date));
          // Ranks use the profile bodyweight, so keep it in step with the newest measurement.
          const newest = measurements[measurements.length - 1];
          set({ measurements, profile: newest === m ? { ...get().profile, bodyweight: m.bodyweight } : get().profile });
        },

        startWorkout: () => {
          if (!get().active) set({ active: { id: uid(), date: new Date().toISOString(), name: "Workout", exercises: [] } });
        },
        addExercise: (exerciseId) =>
          patchActive((w) => ({ ...w, exercises: [...w.exercises, { exerciseId, sets: [{ id: uid(), weight: 0, reps: 0, done: false }] }] })),
        removeExercise: (exIdx) => patchActive((w) => ({ ...w, exercises: w.exercises.filter((_, i) => i !== exIdx) })),
        addSet: (exIdx) =>
          patchActive((w) => ({
            ...w,
            exercises: w.exercises.map((e, i) => {
              if (i !== exIdx) return e;
              const last = e.sets[e.sets.length - 1];
              return { ...e, sets: [...e.sets, { id: uid(), weight: last?.weight ?? 0, reps: last?.reps ?? 0, rpe: last?.rpe, done: false }] };
            }),
          })),
        removeSet: (exIdx, setIdx) =>
          patchActive((w) => ({
            ...w,
            exercises: w.exercises.map((e, i) => (i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e)),
          })),
        updateSet: (exIdx, setIdx, patch) =>
          patchActive((w) => ({
            ...w,
            exercises: w.exercises.map((e, i) => (i === exIdx ? { ...e, sets: e.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) } : e)),
          })),

        finishWorkout: () => {
          const { active, workouts, profile } = get();
          if (!active) return null;
          const exercises = active.exercises
            .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done && s.reps > 0) }))
            .filter((e) => e.sets.length);
          if (!exercises.length) return null;
          const finished: Workout = {
            ...active,
            date: new Date().toISOString(),
            exercises,
            durationMin: Math.min(LIMITS.maxDurationMin, Math.max(1, Math.round((Date.now() - Date.parse(active.date)) / 60000))),
          };
          const next = [...workouts, finished];
          const before = exerciseBests(workouts, profile);
          const after = exerciseBests(next, profile);
          let records = 0;
          let rankUps = 0;
          for (const id of Object.keys(after)) {
            const b = before[id];
            if (b && after[id].e1rm > b.e1rm) records++;
            if (b && after[id].rank.tier.index > b.rank.tier.index) rankUps++;
          }
          const oBefore = overallRank(before);
          const oAfter = overallRank(after);
          const petBefore = petProgress(workouts, profile);
          const petAfter = petProgress(next, profile);
          const newTrophies = newlyUnlocked(workouts, next, profile);
          set({ workouts: next, active: null, rest: { ...get().rest, endsAt: null } });
          return {
            workout: finished,
            newTrophies,
            xp: petAfter.xp - petBefore.xp,
            records,
            rankUps,
            overallRankUp: !!oBefore && !!oAfter && oAfter.tier.index > oBefore.tier.index,
            levelBefore: petBefore.level,
            levelAfter: petAfter.level,
          };
        },
        discardWorkout: () => set({ active: null }),

        startRest: (seconds) => {
          const duration = seconds ?? get().rest.duration;
          set({ rest: { duration, endsAt: Date.now() + duration * 1000 } });
        },
        adjustRest: (delta) => {
          const { endsAt, duration } = get().rest;
          if (endsAt) set({ rest: { duration, endsAt: Math.max(Date.now(), endsAt + delta * 1000) } });
          else set({ rest: { duration: Math.max(15, duration + delta), endsAt: null } });
        },
        stopRest: () => set({ rest: { ...get().rest, endsAt: null } }),
      };
    },
    {
      name: "liftoff-store",
      version: 4, // v4: stored data is re-validated once by migrateState
      migrate: migrateState,
      partialize: (s) => {
        const { seeded, profile, companionName, arenaId, workouts, measurements, active, rest } = s;
        return { seeded, profile, companionName, arenaId, workouts, measurements, active, rest };
      },
    },
  ),
);

// v1 carried the Egg economy (dropped); v2 stored the pet as petName with "Barbell" as its default.
export function migrateState(old: unknown): State {
  const o = old as Partial<State> & { petName?: string };
  const { equippedTitle: _drop, ...rawProfile } = (o.profile ?? DEFAULT_PROFILE) as Profile & { equippedTitle?: unknown };
  void _drop;
  const bw = Number(rawProfile.bodyweight);
  const profile: Profile = { ...DEFAULT_PROFILE, ...rawProfile, bodyweight: bw >= LIMITS.minBodyweight && bw <= LIMITS.maxBodyweight ? bw : DEFAULT_PROFILE.bodyweight };
  // Drop malformed workouts so one bad record cannot crash every page.
  const okWorkout = (w: Workout) => w && typeof w.date === "string" && Array.isArray(w.exercises) && w.exercises.every((e) => Array.isArray(e?.sets));
  o.workouts = (o.workouts ?? []).filter(okWorkout);
  o.active = o.active && okWorkout(o.active) ? o.active : null;
  const custom = o.companionName ?? (o.petName && o.petName !== "Barbell" ? o.petName : undefined);
  return { seeded: o.seeded ?? false, profile, companionName: custom?.trim().slice(0, 24) || DEFAULT_COMPANION_NAME, arenaId: o.arenaId ?? null, workouts: o.workouts ?? [], measurements: o.measurements ?? [], active: o.active ?? null, rest: o.rest ?? { endsAt: null, duration: 90 } } as State;
}

/** Live rank of a single set, used by the logger badge and rank-up overlay. */
export function liveSetRank(exerciseId: string, set: Pick<WorkoutSet, "weight" | "reps">, profile: Profile) {
  const ex = EXERCISE_MAP[exerciseId];
  if (!ex) return { e1rm: 0, rank: rankFromScore(1) }; // exercise removed from the catalogue
  const e1rm = setE1rm(ex, set, profile.bodyweight);
  return { e1rm: Math.round(e1rm), rank: rankFromE1rm(ex, e1rm, profile.bodyweight, profile.sex) };
}
