// Self-check for the ranking engine: node scripts/ranking-check.mts
import assert from "node:assert/strict";
import { epley, scoreFromE1rm, e1rmForScore, rankFromScore, tierOf, TIERS } from "../src/lib/ranking.ts";

const bench = { id: "b", name: "Bench", equipment: "barbell", primary: ["chest"], secondary: [], pattern: "horizontalPush", elite: 2.25 } as const;

assert.equal(epley(225, 1), 225);
assert.ok(Math.abs(epley(200, 3) - 220) < 1e-9);
assert.equal(epley(0, 5), 0);
assert.equal(tierOf(110).name, "Wood");
assert.equal(tierOf(111).name, "Bronze");
assert.equal(tierOf(881).name, "Olympian");
assert.equal(TIERS[8].max, 1000);
assert.equal(rankFromScore(111).lp, 0);
assert.equal(rankFromScore(220).lp, 99);
assert.equal(rankFromScore(1000).lp, 100);
// Elite e1RM scores 1000, and the inverse round-trips.
assert.equal(scoreFromE1rm(bench as never, 2.25 * 180, 180, "male"), 1000);
assert.ok(Math.abs(scoreFromE1rm(bench as never, e1rmForScore(bench as never, 441, 180, "male"), 180, "male") - 441) <= 1);
// Same lift scores higher for a lighter lifter and for a female lifter.
assert.ok(scoreFromE1rm(bench as never, 225, 150, "male") > scoreFromE1rm(bench as never, 225, 220, "male"));
assert.ok(scoreFromE1rm(bench as never, 135, 140, "female") > scoreFromE1rm(bench as never, 135, 140, "male"));
console.log("ranking-check: ok");
