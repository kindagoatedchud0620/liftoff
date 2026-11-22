// Self-check for the record rule: npx tsx --tsconfig tsconfig.json scripts/record-check.mts
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// The component tree imports CSS; stub it so the module loads under tsx.
const require = createRequire(import.meta.url);
(require.extensions as Record<string, unknown>)[".css"] = () => {};
const { isSetRecord } = await import("../src/components/tracker/ExerciseBlock.tsx");

const prior = { e1rm: 200, volume: 1000 };
assert.equal(isSetRecord({ e1rm: 210, volume: 900 }, prior), true, "e1rm record");
assert.equal(isSetRecord({ e1rm: 190, volume: 1100 }, prior), true, "volume record, not e1rm");
assert.equal(isSetRecord({ e1rm: 500, volume: 5000 }, { e1rm: 0, volume: 0 }), false, "first-ever set");
assert.equal(isSetRecord({ e1rm: 200, volume: 1000 }, prior), false, "equal values");
assert.equal(isSetRecord({ e1rm: 150, volume: 800 }, prior), false, "lower");
console.log("record-check ok");
