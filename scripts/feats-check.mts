// Self-check for recovery and trophies: npx tsx --tsconfig tsconfig.json scripts/feats-check.mts
import assert from "node:assert/strict";
import { buildSeed } from "../src/data/seed.ts";
import { muscleRecovery } from "../src/lib/recovery.ts";
import { longestStreakDays, longestWeekendRun, trophyStates } from "../src/lib/trophies.ts";

const H = 3_600_000;
const now = Date.parse("2026-11-21T12:00:00");
const w = (hoursAgo: number, exerciseId: string, weight = 100) => ({
  id: `w${hoursAgo}${exerciseId}`,
  date: new Date(now - hoursAgo * H).toISOString(),
  name: "T",
  exercises: [{ exerciseId, sets: [{ id: "s", weight, reps: 5, done: true }] }],
});

// Recovery: primary and secondary movers, 24 and 48 hour boundaries, untrained muscles are rested.
const r = muscleRecovery([w(10, "bench-press"), w(30, "barbell-row"), w(60, "back-squat")], now);
assert.equal(r.chest.status, "peak");
assert.equal(r.triceps.status, "peak"); // bench secondary
assert.equal(r.lats.status, "active");
assert.equal(r.quads.status, "rested");
assert.equal(r.calves.status, "rested");
assert.equal(r.calves.lastAt, null);
assert.equal(Math.round(r.lats.hoursRemaining), 18);
assert.equal(r.chest.lastExerciseId, "bench-press");
// An unfinished (unchecked) set does not count.
const undone = { ...w(5, "leg-curl"), exercises: [{ exerciseId: "leg-curl", sets: [{ id: "s", weight: 50, reps: 5, done: false }] }] };
assert.equal(muscleRecovery([undone], now).hamstrings.status, "rested");

// Weekend runs: Sat 2026-11-07, Sun 2026-11-15, Sat 2026-11-21 => 3 consecutive; a gap resets.
const at = (iso: string) => ({ ...w(0, "bench-press"), id: iso, date: new Date(iso).toISOString() });
assert.equal(longestWeekendRun([at("2026-11-07T10:00"), at("2026-11-15T10:00"), at("2026-11-21T10:00")]), 3);
assert.equal(longestWeekendRun([at("2026-10-24T10:00"), at("2026-11-07T10:00")]), 1);
assert.equal(longestWeekendRun([at("2026-11-04T10:00")]), 0); // a Wednesday
// Streak span breaks on a gap over 72 hours.
assert.equal(longestStreakDays([at("2026-11-01T10:00"), at("2026-11-03T10:00"), at("2026-11-10T10:00"), at("2026-11-12T10:00")]), 2);

// Seeded history: recovery shows active states, and feats match the intended demo picture.
const seed = buildSeed(Date.now());
const profile = { name: "t", sex: "male", bodyweight: 180 } as const;
const rec = Object.values(muscleRecovery(seed.workouts, Date.now()));
assert.ok(rec.some((m) => m.status === "peak"), "some muscle in peak recovery");
assert.ok(rec.some((m) => m.status === "active"), "some muscle in active recovery");
assert.ok(rec.some((m) => m.status === "rested"), "some muscle fully rested");
const feats = Object.fromEntries(trophyStates(seed.workouts, profile).map((t) => [t.def.id, t]));
for (const id of ["thousand-club", "heavy-metal-century", "unbreakable-consistency", "weekend-warrior"]) assert.ok(feats[id].unlocked, `${id} unlocked`);
for (const id of ["symmetry-master", "apex-contender"]) assert.ok(!feats[id].unlocked && feats[id].fraction > 0.5, `${id} in progress`);
for (const t of Object.values(feats)) if (t.unlocked) assert.ok(t.unlockedAt, `${t.def.id} has an unlock date`);
console.log("feats-check: ok", Object.values(feats).map((t) => `${t.def.id}=${t.def.format(t.progress, t.def.target)}${t.unlocked ? " (unlocked " + t.unlockedAt?.slice(0, 10) + ")" : ""}`));
