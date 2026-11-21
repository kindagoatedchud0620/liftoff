"use client";

import { useEffect, useMemo, useState } from "react";
import { computeStreak } from "@/lib/gamification";
import { petProgress } from "@/lib/pet";
import { exerciseBests, muscleRanks, overallRank } from "@/lib/stats";
import { useStore } from "./useStore";

/** Current time, re-rendering every `ms`. */
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Ranks derived from finished workouts. Recomputed only when workouts or profile change. */
export function useRanks() {
  const workouts = useStore((s) => s.workouts);
  const profile = useStore((s) => s.profile);
  return useMemo(() => {
    const bests = exerciseBests(workouts, profile);
    const overall = overallRank(bests);
    return { bests, overall, muscles: muscleRanks(bests, overall) };
  }, [workouts, profile]);
}

export function useStreak() {
  const workouts = useStore((s) => s.workouts);
  const now = useNow();
  return useMemo(() => computeStreak(workouts, now), [workouts, now]);
}

/** Pet level and evolution stage, derived from workout history. */
export function usePet() {
  const workouts = useStore((s) => s.workouts);
  const profile = useStore((s) => s.profile);
  const name = useStore((s) => s.petName);
  return { name, ...useMemo(() => petProgress(workouts, profile), [workouts, profile]) };
}
