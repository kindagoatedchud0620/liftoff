// Self-check for pet progression: npx tsx --tsconfig tsconfig.json scripts/pet-check.mts
import assert from "node:assert/strict";
import { buildSeed } from "../src/data/seed.ts";
import { PET_XP, levelFromXp, petProgress, stageForLevel, xpForLevel } from "../src/lib/pet.ts";

const profile = { name: "t", sex: "male", bodyweight: 180 } as const;
assert.equal(xpForLevel(1), 0);
assert.equal(levelFromXp(0), 1);
assert.equal(levelFromXp(xpForLevel(7)), 7);
assert.equal(levelFromXp(xpForLevel(7) - 1), 6);
assert.deepEqual([1, 4, 5, 9, 10, 14, 15, 30].map((l) => stageForLevel(l).index), [0, 0, 1, 1, 2, 2, 3, 3]);

// One workout earns only the workout award; a heavier repeat earns a record too.
const set = (w: number) => ({ id: "s", weight: w, reps: 5, done: true });
const w1 = { id: "a", date: "2026-01-01T00:00:00Z", name: "A", exercises: [{ exerciseId: "bench-press", sets: [set(135)] }] };
const w2 = { ...w1, id: "b", date: "2026-01-03T00:00:00Z", exercises: [{ exerciseId: "bench-press", sets: [set(140)] }] };
assert.equal(petProgress([w1], profile).xp, PET_XP.workout);
assert.ok(petProgress([w2, w1], profile).xp >= 2 * PET_XP.workout + PET_XP.record); // order-independent replay

// Seeded history lands on the Heavyweight Guardian stage with room to grow.
const seeded = petProgress(buildSeed(Date.now()).workouts, profile);
assert.equal(seeded.stage.name, "Heavyweight Guardian");
assert.ok(seeded.xp < seeded.nextLevelXp);
console.log("pet-check: ok", { level: seeded.level, xp: seeded.xp });
