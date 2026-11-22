/** Training arenas unlock as the Overall Liftoff Rank score climbs (two tiers per arena). */
export type ArenaId = "garage" | "warehouse" | "neon" | "olympus";

export interface ArenaInfo {
  id: ArenaId;
  name: string;
  tiers: string; // human label of the tiers that unlock it
  minScore: number; // overall score needed to unlock
  description: string;
}

export const ARENAS: ArenaInfo[] = [
  { id: "garage", name: "Gritty Garage Gym", tiers: "Wood and Bronze", minScore: 1, description: "Cracked concrete, timber framing, rusted plates and a single warm Edison bulb." },
  { id: "warehouse", name: "Industrial Iron Warehouse", tiers: "Silver and Gold", minScore: 221, description: "Steel floor grating, weathered brick, a heavy power rack and gleaming chrome dumbbells." },
  { id: "neon", name: "Neon Glacier Arena", tiers: "Platinum and Diamond", minScore: 441, description: "Glossy ice floor with a glowing grid, crystal pillars and cool neon light." },
  { id: "olympus", name: "Mount Olympus Coliseum", tiers: "Champion, Titan and Olympian", minScore: 661, description: "Marble columns above the clouds, golden braziers and a sunset sky." },
];

export const ARENA_MAP = Object.fromEntries(ARENAS.map((a) => [a.id, a])) as Record<ArenaId, ArenaInfo>;

export const isArenaUnlocked = (id: ArenaId, score: number) => score >= ARENA_MAP[id].minScore;

/** Highest arena the score unlocks (the garage is always open). */
export const bestArena = (score: number): ArenaId => [...ARENAS].reverse().find((a) => score >= a.minScore)?.id ?? "garage";

/** The arena to show: the user's pick if still unlocked, otherwise the best unlocked one. */
export const activeArena = (picked: ArenaId | null, score: number): ArenaId =>
  picked && isArenaUnlocked(picked, score) ? picked : bestArena(score);
