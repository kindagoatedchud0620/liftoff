import type { Object3D } from "three";
import type { PetAction } from "../../lib/pet";

/** Named, pivoted joints of the companion. Optional parts are skipped when absent. */
export interface PetRig {
  root: Object3D;
  body: Object3D;
  head: Object3D;
  armL: { shoulder: Object3D; elbow: Object3D; hand: Object3D };
  armR: { shoulder: Object3D; elbow: Object3D; hand: Object3D };
  legL: Object3D;
  legR: Object3D;
  mouth?: Object3D;
  /** Eyelids: scale y 0 (open) to 1 (closed), hidden when nearly open. */
  lids?: [Object3D, Object3D];
  dumbbells: { left: Object3D; right: Object3D };
}

export interface AnimatorOptions {
  reducedMotion: boolean;
  /** Called once when the record celebration reaches its flex pose. */
  onBurst?: () => void;
}

export interface PetAnimator {
  play: (action: PetAction) => void;
  setTired: (tired: boolean) => void;
  update: (dt: number) => void;
  current: () => PetAction;
}

type Key = readonly [number, number];
type Tracks = Record<string, Key[]>;
type Pose = Record<string, number>;

/*
 * Every channel is a delta from the joint's rest pose (except dbS and lid, which are absolute 0..1).
 * Arm channels are prefixed L. or R.; shZ and elZ are positive when moving outward and are mirrored per side.
 */
const ARM = ["shX", "shZ", "elX", "elZ"];
const CHANNELS = [
  "rootY", "rootRy", "crouch", "bodySy", "bodyRx", "headRx", "headRz", "headRy", "legL", "legR", "dbS", "mouth", "lid",
  ...["L", "R"].flatMap((s) => ARM.map((a) => `${s}.${a}`)),
];
const LEG_LENGTH = 0.23; // hip to foot, used to keep the feet planted while crouching
const BLEND = 0.3;
const TAU = Math.PI * 2;

/** Monotone cubic hermite: smooth, no overshoot on flat holds. */
function sampleTrack(k: Key[], t: number): number {
  const n = k.length;
  if (t <= k[0][0]) return k[0][1];
  if (t >= k[n - 1][0]) return k[n - 1][1];
  let i = 0;
  while (k[i + 1][0] < t) i++;
  const slope = (a: number) => (k[a + 1][1] - k[a][1]) / Math.max(1e-6, k[a + 1][0] - k[a][0]);
  const tan = (a: number) => {
    if (a === 0 || a === n - 1) return 0;
    const d0 = slope(a - 1);
    const d1 = slope(a);
    return d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1);
  };
  const h = Math.max(1e-6, k[i + 1][0] - k[i][0]);
  const u = (t - k[i][0]) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * k[i][1] + (u3 - 2 * u2 + u) * h * tan(i) + (-2 * u3 + 3 * u2) * k[i + 1][1] + (u3 - u2) * h * tan(i + 1);
}

interface Def {
  dur: number;
  loop: boolean;
  tracks: Tracks;
  burstAt?: number;
}

const mapKeys = (k: Key[], f: number): Key[] => k.map(([t, v]) => [t, v * f]);

/** Calm-motion multipliers per channel (reduced motion). */
const CALM: Record<string, number> = { rootY: 0.25, rootRy: 0, crouch: 0.5, legL: 0.5, legR: 0.5, bodySy: 0.6, bodyRx: 0.6, headRx: 0.7, headRz: 0.7, headRy: 0.7 };

function buildDefs(reduced: boolean): Record<PetAction, Def> {
  const T = reduced ? 0.65 : 1;
  const finish = (raw: Tracks, dur: number, loop: boolean, calmAll = false, burstAt?: number): Def => {
    const tracks: Tracks = {};
    for (const ch of Object.keys(raw)) {
      const base = ch.split(".").pop() as string;
      const f = !reduced ? 1 : calmAll ? 0.5 : CALM[ch] ?? (base === "shX" || base === "shZ" ? 0.8 : 1);
      tracks[ch] = raw[ch].map(([t, v]) => [t * T, v * f] as Key);
    }
    return { dur: dur * T, loop, tracks, burstAt: burstAt === undefined ? undefined : burstAt * T };
  };
  const both = (k: Key[], prefix: string): Tracks => ({ [`L.${prefix}`]: k, [`R.${prefix}`]: k });

  // IDLE: breathing, arm sway, head tilt (4s loop; first and last keys match).
  const idle = finish(
    {
      bodySy: [[0, 0], [2, 0.03], [4, 0]],
      headRz: [[0, -0.05], [2, 0.05], [4, -0.05]],
      headRx: [[0, 0], [1.2, 0.04], [2.8, -0.03], [4, 0]],
      "L.shX": [[0, 0], [2, 0.06], [4, 0]],
      "R.shX": [[0, 0.06], [2, 0], [4, 0.06]],
      "L.shZ": [[0, 0], [2, 0.07], [4, 0]],
      "R.shZ": [[0, 0.07], [2, 0], [4, 0.07]],
    },
    4, true, true,
  );

  // LIFTING_DUMBBELLS: 3.6s. Three alternating curls (right, left, right), one overhead press, knee bounce on each rep.
  const crouch: Key[] = [[0, 0], [0.5, 0.1], [0.75, 0], [1.05, 0.1], [1.3, 0], [1.6, 0.1], [1.85, 0], [2.35, 0.14], [2.85, 0], [3.6, 0]];
  const lift = finish(
    {
      dbS: [[0, 0], [0.3, 1.1], [0.45, 1], [3.0, 1], [3.5, 0], [3.6, 0]],
      ...both([[0, 0], [0.35, -0.25], [2.2, -0.25], [2.85, -2.9], [3.05, -2.9], [3.4, -0.3], [3.6, 0]], "shX"),
      ...both([[0, 0], [2.3, 0], [2.85, 0.2], [3.05, 0.2], [3.5, 0]], "shZ"),
      "R.elX": [[0, 0], [0.3, -0.4], [0.47, -0.4], [0.75, -2.1], [1.03, -0.4], [1.57, -0.4], [1.85, -2.1], [2.13, -0.4], [2.3, -2.2], [2.85, -0.15], [3.05, -0.15], [3.4, -0.4], [3.6, 0]],
      "L.elX": [[0, 0], [0.3, -0.4], [1.02, -0.4], [1.3, -2.1], [1.58, -0.4], [2.3, -2.2], [2.85, -0.15], [3.05, -0.15], [3.4, -0.4], [3.6, 0]],
      crouch,
      legL: mapKeys(crouch, -2.2),
      legR: mapKeys(crouch, -2.2),
      rootY: [[0, 0], [2.7, 0], [2.9, 0.06], [3.15, 0], [3.6, 0]],
      headRx: [[0, 0], [0.4, 0.1], [2.9, 0.1], [3.5, 0]],
      lid: [[0, 0], [0.3, 0.5], [3.2, 0.5], [3.6, 0]],
      mouth: [[0, 0], [2.3, 0], [2.85, 0.8], [3.15, 0], [3.6, 0]],
    },
    3.6, false,
  );

  // CELEBRATE_RECORD: 2.8s. Crouch, parabolic leap with a full spin, squash landing, held double-bicep flex.
  const arc: Key[] = [[0, 0], [0.5, 0]];
  for (let i = 1; i <= 12; i++) {
    const u = i / 12;
    arc.push([0.5 + u, 1.2 * 4 * u * (1 - u)]);
  }
  arc.push([2.8, 0]);
  const celebrate = finish(
    {
      rootY: arc,
      rootRy: [[0, 0], [0.5, 0], [1.0, Math.PI], [1.5, TAU], [2.8, TAU]],
      crouch: [[0, 0], [0.4, 0.17], [0.5, 0], [1.45, 0], [1.6, 0.18], [1.95, 0.02], [2.8, 0]],
      legL: [[0, 0], [0.4, -0.35], [0.5, 0], [1.45, 0], [1.6, -0.4], [1.95, 0], [2.8, 0]],
      legR: [[0, 0], [0.4, -0.35], [0.5, 0], [1.45, 0], [1.6, -0.4], [1.95, 0], [2.8, 0]],
      bodySy: [[0, 0], [0.4, -0.1], [0.55, 0.1], [1.4, 0.04], [1.6, -0.14], [1.9, 0.04], [2.0, 0.05], [2.8, 0.05]],
      headRx: [[0, 0], [0.4, 0.15], [0.55, -0.25], [1.5, -0.1], [1.6, 0.2], [2.0, -0.2], [2.8, -0.2]],
      ...both([[0, 0], [0.4, 0.7], [0.6, -0.5], [1.5, -0.3], [1.6, 0.3], [2.0, -0.15], [2.8, -0.15]], "shX"),
      ...both([[0, 0], [0.4, -0.2], [0.6, 1.3], [1.5, 1.1], [1.65, 0.5], [2.0, 1.07], [2.8, 1.07]], "shZ"),
      ...both([[0, 0], [0.6, -0.8], [1.5, -0.5], [2.0, -0.15], [2.8, -0.15]], "elX"),
      ...both([[0, 0], [1.5, 0], [1.65, 0.4], [2.0, 1.75], [2.25, 1.95], [2.5, 1.75], [2.8, 1.8]], "elZ"),
      mouth: [[0, 0], [0.55, 0], [0.9, 1.2], [1.5, 0.8], [1.7, 0.3], [2.8, 0.3]],
    },
    2.8, false, false, 1.7,
  );

  // TIRED_YAWN: 6s loop. Slump, hand covers a slowly opening yawn, both arms stretch overhead, slow settle.
  const slump = (v: number): Key[] => [[0, v], [6, v]];
  const tired = finish(
    {
      bodyRx: [[0, 0.17], [1, 0.17], [1.6, 0.2], [2.8, 0.1], [3.4, -0.1], [4.2, -0.1], [5.0, 0.15], [6, 0.17]],
      headRx: [[0, 0.3], [1, 0.35], [2.8, 0.1], [3.5, -0.3], [4.2, -0.25], [5.0, 0.3], [6, 0.3]],
      crouch: slump(0.04),
      lid: [[0, 0.5], [1.2, 0.55], [2.0, 0.9], [3.0, 0.8], [3.6, 0.3], [4.4, 0.4], [5.2, 0.55], [6, 0.5]],
      mouth: [[0, 0], [1.5, 0], [2.5, 2.4], [3.1, 2.0], [3.8, 0], [6, 0]],
      "R.shX": [[0, 0.05], [1.2, 0.05], [2.0, -1.5], [3.0, -1.5], [3.5, -2.8], [4.2, -2.8], [5.0, 0.05], [6, 0.05]],
      "R.elX": [[0, -0.1], [1.2, -0.1], [2.0, -1.9], [3.0, -1.9], [3.5, -0.2], [4.2, -0.2], [5.0, -0.1], [6, -0.1]],
      "R.shZ": [[0, -0.1], [1.2, -0.1], [2.0, -0.6], [3.0, -0.6], [3.5, 0.5], [4.2, 0.5], [5.0, -0.1], [6, -0.1]],
      "L.shX": [[0, 0.05], [3.1, 0.05], [3.6, -2.8], [4.2, -2.8], [5.0, 0.05], [6, 0.05]],
      "L.shZ": [[0, -0.1], [3.1, -0.1], [3.6, 0.5], [4.2, 0.5], [5.0, -0.1], [6, -0.1]],
      "L.elX": [[0, -0.1], [3.1, -0.1], [3.6, -0.2], [4.2, -0.2], [5.0, -0.1], [6, -0.1]],
    },
    6, true,
  );

  return { IDLE: idle, LIFTING_DUMBBELLS: lift, CELEBRATE_RECORD: celebrate, TIRED_YAWN: tired };
}

interface Rest {
  px: number; py: number; pz: number;
  rx: number; ry: number; rz: number;
  sx: number; sy: number; sz: number;
}
const snap = (o: Object3D): Rest => ({
  px: o.position.x, py: o.position.y, pz: o.position.z,
  rx: o.rotation.x, ry: o.rotation.y, rz: o.rotation.z,
  sx: o.scale.x, sy: o.scale.y, sz: o.scale.z,
});

const wrapAngle = (a: number) => a - TAU * Math.round(a / TAU);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const zero = (): Pose => Object.fromEntries(CHANNELS.map((c) => [c, 0]));

export function createPetAnimator(rig: PetRig, opts: AnimatorOptions): PetAnimator {
  const defs = buildDefs(opts.reducedMotion);
  const rest = {
    root: snap(rig.root), body: snap(rig.body), head: snap(rig.head),
    sL: snap(rig.armL.shoulder), eL: snap(rig.armL.elbow), sR: snap(rig.armR.shoulder), eR: snap(rig.armR.elbow),
    legL: snap(rig.legL), legR: snap(rig.legR),
    mouth: rig.mouth ? snap(rig.mouth) : null,
    lids: rig.lids ? rig.lids.map(snap) : [],
    dbL: snap(rig.dumbbells.left), dbR: snap(rig.dumbbells.right),
  };

  let base: PetAction = "IDLE";
  let shot: PetAction | null = null; // one-shot currently playing
  let active: PetAction = "IDLE";
  let time = 0;
  let blend = 1;
  let from = zero();
  let out = zero();
  let fired = false;

  const begin = (a: PetAction) => {
    active = a;
    time = 0;
    from = { ...out, rootRy: wrapAngle(out.rootRy) };
    blend = 0;
    fired = false;
  };

  const apply = (p: Pose) => {
    rig.root.position.y = rest.root.py + p.rootY;
    rig.root.rotation.y = rest.root.ry + p.rootRy;
    rig.body.position.y = rest.body.py - p.crouch;
    rig.body.scale.set(rest.body.sx * (1 - p.bodySy * 0.5), rest.body.sy * (1 + p.bodySy), rest.body.sz * (1 - p.bodySy * 0.5));
    rig.body.rotation.x = rest.body.rx + p.bodyRx;
    rig.head.rotation.set(rest.head.rx + p.headRx, rest.head.ry + p.headRy, rest.head.rz + p.headRz);
    const arm = (a: PetRig["armL"], s: Rest, e: Rest, side: "L" | "R", sign: number) => {
      a.shoulder.rotation.x = s.rx + p[`${side}.shX`];
      a.shoulder.rotation.z = s.rz + sign * p[`${side}.shZ`];
      a.elbow.rotation.x = e.rx + p[`${side}.elX`];
      a.elbow.rotation.z = e.rz + sign * p[`${side}.elZ`];
    };
    arm(rig.armL, rest.sL, rest.eL, "L", -1);
    arm(rig.armR, rest.sR, rest.eR, "R", 1);
    const legScale = Math.max(0.25, 1 - p.crouch / LEG_LENGTH);
    rig.legL.rotation.x = rest.legL.rx + p.legL;
    rig.legR.rotation.x = rest.legR.rx + p.legR;
    rig.legL.scale.y = rest.legL.sy * legScale;
    rig.legR.scale.y = rest.legR.sy * legScale;
    const d = clamp(p.dbS, 0, 1.2);
    for (const [o, r] of [[rig.dumbbells.left, rest.dbL], [rig.dumbbells.right, rest.dbR]] as const) {
      o.scale.set(r.sx * d, r.sy * d, r.sz * d);
      o.visible = d > 0.02;
    }
    if (rig.mouth && rest.mouth) rig.mouth.scale.y = rest.mouth.sy * (1 + Math.max(0, p.mouth));
    rig.lids?.forEach((l, i) => {
      const k = clamp(p.lid, 0, 1);
      l.visible = k > 0.03;
      l.scale.y = rest.lids[i].sy * Math.max(k, 0.001);
    });
  };
  apply(out);

  return {
    current: () => active,
    play(action) {
      if (action === "IDLE") {
        shot = null;
        if (active !== base) begin(base);
        return;
      }
      if (action === "LIFTING_DUMBBELLS" && shot === "CELEBRATE_RECORD") return; // the celebration is never interrupted
      shot = action;
      begin(action);
    },
    setTired(tired) {
      const next: PetAction = tired ? "TIRED_YAWN" : "IDLE";
      if (next === base) return;
      base = next;
      if (!shot) begin(base);
    },
    update(rawDt) {
      const dt = Number.isFinite(rawDt) ? clamp(rawDt, 0, 0.1) : 0;
      time += dt;
      let def = defs[active];
      if (shot && time >= def.dur) {
        shot = null;
        begin(base);
        def = defs[active];
      } else if (!shot && def.loop && time >= def.dur) {
        time %= def.dur;
      }
      if (def.burstAt !== undefined && !fired && time >= def.burstAt) {
        fired = true;
        opts.onBurst?.();
      }
      if (blend < 1) blend = Math.min(1, blend + dt / BLEND);
      const k = blend * blend * (3 - 2 * blend);
      const next = zero();
      for (const ch of CHANNELS) {
        const track = def.tracks[ch];
        const target = track ? sampleTrack(track, time) : 0;
        next[ch] = from[ch] + (target - from[ch]) * k;
      }
      out = next;
      apply(out);
    },
  };
}
