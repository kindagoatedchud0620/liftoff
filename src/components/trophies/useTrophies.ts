"use client";

import { useMemo } from "react";
import { trophyStates } from "@/lib/trophies";
import { useStore } from "@/store/useStore";

export function useTrophies() {
  const workouts = useStore((s) => s.workouts);
  const profile = useStore((s) => s.profile);
  return useMemo(() => trophyStates(workouts, profile), [workouts, profile]);
}
