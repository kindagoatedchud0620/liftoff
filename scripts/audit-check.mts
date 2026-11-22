// Self-check for data safety rules: TZ=America/New_York npx tsx --tsconfig tsconfig.json scripts/audit-check.mts
import assert from "node:assert/strict";
import { overallHistory } from "../src/lib/stats.ts";
import { LIMITS } from "../src/lib/ranking.ts";
import { migrateState, liveSetRank, useStore } from "../src/store/useStore.ts";
import type { Workout } from "../src/lib/types.ts";

const profile = { name: "T", sex: "male" as const, bodyweight: 180 };
const wk = (id: string, date: string, ex = "bench-press"): Workout => ({ id, date, name: "W", exercises: [{ exerciseId: ex, sets: [{ id: "s", weight: 200, reps: 5, done: true }] }] });

// A Sunday 11:30 pm workout must count in its own week, even in a UTC-5 zone.
const h = overallHistory([wk("a", "2026-11-15T23:30:00")], profile);
assert.equal(h.length, 1);
assert.ok(h[0].score > 0, "sunday-night workout counted in its own week");

// Malformed saved data is dropped or repaired, not carried into the UI.
const m = migrateState({ profile: { name: "T", sex: "male", bodyweight: null }, workouts: [{ id: "x", date: "2026-01-01" }, wk("ok", "2026-01-02")], active: { id: "y" } });
assert.equal(m.workouts.length, 1);
assert.equal(m.profile.bodyweight, 180);
assert.equal(m.active, null);

// An exercise missing from the catalogue ranks as nothing instead of crashing.
assert.equal(liveSetRank("gone", { weight: 100, reps: 5 }, profile).e1rm, 0);

// Store rules: same-day measurement replaces, newest sets bodyweight, delete works, bad import is rejected.
const s = useStore.getState();
s.clearData();
useStore.getState().addMeasurement({ date: "2026-11-20T17:00:00.000Z", bodyweight: 200, bodyFat: 15 });
useStore.getState().addMeasurement({ date: "2026-11-20T17:00:00.000Z", bodyweight: 201, bodyFat: 15 });
assert.equal(useStore.getState().measurements.length, 1);
assert.equal(useStore.getState().profile.bodyweight, 201);
assert.equal(useStore.getState().importData({ state: { workouts: "nope" } }), false);
assert.equal(useStore.getState().importData(null), false);
assert.equal(useStore.getState().importData({ state: { workouts: [wk("keep", "2026-01-02")], profile } }), true);
useStore.getState().deleteWorkout("keep");
assert.equal(useStore.getState().workouts.length, 0);
assert.ok(LIMITS.maxWeight > 0);
console.log("audit-check ok");
