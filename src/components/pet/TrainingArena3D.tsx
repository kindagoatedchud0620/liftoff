"use client";

import WorkoutPet3D from "./WorkoutPet3D";
import type { ArenaId } from "@/lib/arenas";

export { ARENAS } from "@/lib/arenas";

interface Props {
  arena: ArenaId;
  stage: number;
  accent: string;
  tired?: boolean;
  height?: number;
  compact?: boolean;
  className?: string;
}

/** The arena lives inside the companion's single WebGL scene; this just selects it. */
export default function TrainingArena3D({ arena, stage, accent, tired, height, compact, className }: Props) {
  return <WorkoutPet3D stage={stage} accent={accent} arena={arena} tired={tired} height={height} compact={compact} className={className} />;
}
