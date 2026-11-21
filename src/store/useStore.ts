"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed } from "@/data/seed";
import { EXERCISE_MAP } from "@/data/exercises";
import { EGGS, SHOP } from "@/lib/gamification";
import { rankFromE1rm, setE1rm } from "@/lib/ranking";
import { exerciseBests } from "@/lib/stats";
import type { Measurement, Profile, Workout, WorkoutSet } from "@/lib/types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export interface FinishResult {
  eggs: number;
  prs: number;
  rankUps: number;
  doubled: boolean;
}

export interface State {
  seeded: boolean;
  profile: Profile;
  workouts: Workout[];
  measurements: Measurement[];
  eggs: number;
  ownedTitles: string[];
  doubleEggs: boolean;
  revives: string[];
  claimedQuests: string[];
  active: Workout | null;
  rest: { endsAt: number | null; duration: number };

  seed: () => void;
  updateProfile: (p: Partial<Profile>) => void;
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

  claimQuest: (key: string, reward: number) => void;
  buy: (itemId: string) => boolean;
  equipTitle: (title: string | null) => void;
}

const DEFAULT_PROFILE: Profile = { name: "Athlete", sex: "male", bodyweight: 180, equippedTitle: null };

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
        workouts: [],
        measurements: [],
        eggs: 0,
        ownedTitles: [],
        doubleEggs: false,
        revives: [],
        claimedQuests: [],
        active: null,
        rest: { endsAt: null, duration: 90 },

        seed: () => {
          const { workouts, measurements, profile, eggs } = buildSeed(Date.now());
          set({ seeded: true, workouts, measurements, profile: { ...DEFAULT_PROFILE, ...profile }, eggs });
        },
        updateProfile: (p) => set({ profile: { ...get().profile, ...p } }),
        addMeasurement: (m) => set({ measurements: [...get().measurements, m].sort((a, b) => a.date.localeCompare(b.date)) }),

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
          const { active, workouts, profile, doubleEggs, eggs } = get();
          if (!active) return null;
          const exercises = active.exercises
            .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done && s.reps > 0) }))
            .filter((e) => e.sets.length);
          if (!exercises.length) return null;
          const started = Date.parse(active.date);
          const finished: Workout = {
            ...active,
            date: new Date().toISOString(),
            exercises,
            durationMin: Math.max(1, Math.round((Date.now() - started) / 60000)),
          };
          const before = exerciseBests(workouts, profile);
          const after = exerciseBests([...workouts, finished], profile);
          let prs = 0;
          let rankUps = 0;
          for (const id of Object.keys(after)) {
            const b = before[id];
            if (b && after[id].e1rm > b.e1rm) prs++;
            if (b && after[id].rank.tier.index > b.rank.tier.index) rankUps++;
          }
          const base = EGGS.workout + prs * EGGS.pr + rankUps * EGGS.rankUp;
          const earned = doubleEggs ? base * 2 : base;
          set({ workouts: [...workouts, finished], active: null, eggs: eggs + earned, doubleEggs: false, rest: { ...get().rest, endsAt: null } });
          return { eggs: earned, prs, rankUps, doubled: doubleEggs };
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

        claimQuest: (key, reward) => {
          const { claimedQuests, eggs } = get();
          if (!claimedQuests.includes(key)) set({ claimedQuests: [...claimedQuests, key], eggs: eggs + reward });
        },
        buy: (itemId) => {
          const item = SHOP.find((i) => i.id === itemId);
          const s = get();
          if (!item || s.eggs < item.price) return false;
          if (item.kind === "title") {
            if (s.ownedTitles.includes(item.name)) return false;
            set({ eggs: s.eggs - item.price, ownedTitles: [...s.ownedTitles, item.name] });
          } else if (item.kind === "double") {
            if (s.doubleEggs) return false;
            set({ eggs: s.eggs - item.price, doubleEggs: true });
          } else {
            set({ eggs: s.eggs - item.price, revives: [...s.revives, new Date().toISOString()] });
          }
          return true;
        },
        equipTitle: (title) => {
          if (title === null || get().ownedTitles.includes(title)) set({ profile: { ...get().profile, equippedTitle: title } });
        },
      };
    },
    {
      name: "liftoff-store",
      version: 1,
      partialize: (s) => {
        // Persist data only; actions are recreated.
        const { seeded, profile, workouts, measurements, eggs, ownedTitles, doubleEggs, revives, claimedQuests, active, rest } = s;
        return { seeded, profile, workouts, measurements, eggs, ownedTitles, doubleEggs, revives, claimedQuests, active, rest };
      },
    },
  ),
);

/** Live rank of a single set against the exercise's prior best, used by the logger badge and rank-up modal. */
export function liveSetRank(exerciseId: string, set: Pick<WorkoutSet, "weight" | "reps">, profile: Profile) {
  const ex = EXERCISE_MAP[exerciseId];
  const e1rm = setE1rm(ex, set, profile.bodyweight);
  return { e1rm: Math.round(e1rm), rank: rankFromE1rm(ex, e1rm, profile.bodyweight, profile.sex) };
}
