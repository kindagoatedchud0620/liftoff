import type { ArenaId } from "@/lib/arenas";
import type { ArenaBuild } from "./types";
import { buildGarage } from "./garage";
import { buildNeon } from "./neon";
import { buildOlympus } from "./olympus";
import { buildWarehouse } from "./warehouse";

export type { ArenaBuild, ArenaBuilder } from "./types";

export function buildArena(id: ArenaId): ArenaBuild {
  switch (id) {
    case "garage":
      return buildGarage();
    case "warehouse":
      return buildWarehouse();
    case "neon":
      return buildNeon();
    case "olympus":
      return buildOlympus();
  }
}
