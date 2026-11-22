"use client";

import { create } from "zustand";
import type { PetAction } from "@/lib/pet";

/**
 * In-memory event channel from the Workout Logger to every mounted companion canvas (not persisted).
 * `id` increases on each reaction so the same action can retrigger.
 */
export interface PetReaction {
  action: Exclude<PetAction, "IDLE" | "TIRED_YAWN">;
  id: number;
}

export const usePetEvents = create<{ reaction: PetReaction | null; react: (action: PetReaction["action"]) => void }>((set, get) => ({
  reaction: null,
  react: (action) => set({ reaction: { action, id: (get().reaction?.id ?? 0) + 1 } }),
}));
