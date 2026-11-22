// Self-check for the companion animator: npx tsx --tsconfig tsconfig.json scripts/pet-anim-check.mts
import assert from "node:assert/strict";
import { Object3D } from "three";
import { createPetAnimator, type PetRig } from "../src/components/pet/petAnimations.ts";

const mk = () => new Object3D();
const arm = () => ({ shoulder: mk(), elbow: mk(), hand: mk() });
const makeRig = (): PetRig => {
  const rig: PetRig = { root: mk(), body: mk(), head: mk(), armL: arm(), armR: arm(), legL: mk(), legR: mk(), mouth: mk(), lids: [mk(), mk()], dumbbells: { left: mk(), right: mk() } };
  rig.armL.shoulder.rotation.z = -0.5;
  rig.armR.shoulder.rotation.z = 0.5;
  rig.dumbbells.left.visible = rig.dumbbells.right.visible = false;
  return rig;
};
const nodes = (r: PetRig) => [r.root, r.body, r.head, r.armL.shoulder, r.armL.elbow, r.armR.shoulder, r.armR.elbow, r.legL, r.legR, r.mouth!, ...r.lids!, r.dumbbells.left, r.dumbbells.right];
const finite = (r: PetRig) =>
  nodes(r).forEach((o) => [...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray()].forEach((v) => assert.ok(Number.isFinite(v), "NaN in joint")));
const run = (a: ReturnType<typeof createPetAnimator>, r: PetRig, secs: number, onStep?: () => void) => {
  for (let i = 0; i < secs * 60; i++) { a.update(1 / 60); finite(r); onStep?.(); }
};

for (const reducedMotion of [false, true]) {
  // One-shots return to IDLE; dumbbells only visible during lifting.
  for (const action of ["LIFTING_DUMBBELLS", "CELEBRATE_RECORD", "TIRED_YAWN"] as const) {
    const rig = makeRig();
    let bursts = 0;
    const a = createPetAnimator(rig, { reducedMotion, onBurst: () => bursts++ });
    a.play(action);
    assert.equal(a.current(), action);
    let sawDb = false;
    run(a, rig, 3, () => { if (rig.dumbbells.left.visible) sawDb = true; });
    if (action === "LIFTING_DUMBBELLS") assert.ok(sawDb, "hand dumbbells shown while lifting");
    else assert.ok(!sawDb, "no hand dumbbells outside lifting");
    run(a, rig, 8);
    assert.equal(a.current(), "IDLE", `${action} returns to IDLE`);
    assert.ok(!rig.dumbbells.left.visible && !rig.dumbbells.right.visible, "dumbbells hidden after");
    assert.equal(bursts, action === "CELEBRATE_RECORD" ? 1 : 0, "burst fires once for celebrate only");
  }

  // Tired: loops, and a one-shot returns to TIRED_YAWN.
  {
    const rig = makeRig();
    const a = createPetAnimator(rig, { reducedMotion });
    a.setTired(true);
    assert.equal(a.current(), "TIRED_YAWN");
    run(a, rig, 20);
    assert.equal(a.current(), "TIRED_YAWN");
    a.play("LIFTING_DUMBBELLS");
    assert.equal(a.current(), "LIFTING_DUMBBELLS");
    run(a, rig, 6);
    assert.equal(a.current(), "TIRED_YAWN");
    assert.ok(!rig.dumbbells.left.visible);
    a.setTired(false);
    assert.equal(a.current(), "IDLE");
  }

  // Celebrate is not replaced by a lift; a lift is replaced by a celebrate.
  {
    const rig = makeRig();
    const a = createPetAnimator(rig, { reducedMotion });
    a.play("CELEBRATE_RECORD");
    run(a, rig, 0.5);
    a.play("LIFTING_DUMBBELLS");
    assert.equal(a.current(), "CELEBRATE_RECORD");
    run(a, rig, 0.5);
    assert.ok(!rig.dumbbells.left.visible);
    a.play("IDLE");
    a.play("LIFTING_DUMBBELLS");
    run(a, rig, 0.5);
    a.play("CELEBRATE_RECORD");
    assert.equal(a.current(), "CELEBRATE_RECORD");
  }

  // Zero, tiny, huge, negative and NaN steps stay stable; no snapping on a switch (crossfade).
  {
    const rig = makeRig();
    const a = createPetAnimator(rig, { reducedMotion });
    a.play("LIFTING_DUMBBELLS");
    run(a, rig, 1.2);
    const before = rig.armR.elbow.rotation.x;
    a.play("TIRED_YAWN");
    a.update(0);
    assert.equal(rig.armR.elbow.rotation.x, before, "update(0) right after a switch keeps the pose");
    a.update(1 / 60);
    assert.ok(Math.abs(rig.armR.elbow.rotation.x - before) < 0.6, "switch blends instead of snapping");
    for (const dt of [0, 1e-9, 1e-4, -1, NaN, 5, Infinity]) { a.update(dt); finite(rig); }
    // Rest pose is preserved as the base: shoulder tilt returns near its rest value when idle.
    a.play("IDLE");
    run(a, rig, 3);
    assert.ok(Math.abs(rig.armR.shoulder.rotation.z - 0.5) < 0.12);
  }
}
console.log("pet-anim-check ok");
