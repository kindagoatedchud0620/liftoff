import type { Color, Group } from "three";
import type { ArenaId } from "@/lib/arenas";

/**
 * A procedural training arena placed in the same Three.js scene as the companion (one WebGL context).
 * World space: y-up, floor at y = 0, the companion stands at the origin facing +z (toward the camera).
 */
export interface ArenaBuild {
  id: ArenaId;
  /** Everything the arena adds: floor, walls, props and its own lights. Added to the scene root (does not rotate with the pet). */
  group: Group;
  /** Solid scene background; the canvas stays transparent when omitted. */
  background?: Color;
  /** Optional linear fog color and range for depth. */
  fog?: { color: Color; near: number; far: number };
  /** Animates fans, flames, flicker, drifting particles. */
  tick: (t: number, dt: number) => void;
  /** Frees every geometry, material and texture the arena created. */
  dispose: () => void;
}

export type ArenaBuilder = () => ArenaBuild;
