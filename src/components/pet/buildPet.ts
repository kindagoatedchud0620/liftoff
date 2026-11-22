import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
  SphereGeometry,
  TorusGeometry,
  type MeshStandardMaterialParameters,
} from "three";
import type { PetRig } from "./petAnimations";

export type { PetRig } from "./petAnimations";

export interface PetModel {
  pet: Group;
  /** Named, pivoted joints driven by the keyframed animator. */
  rig: PetRig;
  /** Advances procedural animation (orbits, pulses, floating props). */
  tick: (t: number, dt: number) => void;
  /** 0 = eyes open, 1 = closed. */
  blink: (amount: number) => void;
}

/** Body space is y-up with the feet at 0; the pet group pivots around PET_PIVOT. */
export const PET_PIVOT = 1.6;

const mat = (color: string | Color, o: MeshStandardMaterialParameters = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...o });

function put<T extends Object3D>(parent: Object3D, child: T, x = 0, y = 0, z = 0): T {
  child.position.set(x, y, z);
  parent.add(child);
  return child;
}

const ball = (parent: Object3D, r: number, m: Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const mesh = put(parent, new Mesh(new SphereGeometry(r, 32, 24), m), x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
};

function dumbbell(metal: Material, grip: Material): Group {
  const g = new Group();
  const bar = put(g, new Mesh(new CylinderGeometry(0.04, 0.04, 0.8, 12), metal));
  bar.rotation.z = Math.PI / 2;
  const mid = put(g, new Mesh(new CylinderGeometry(0.055, 0.055, 0.24, 12), grip));
  mid.rotation.z = Math.PI / 2;
  for (const sx of [-1, 1]) {
    for (const [dx, r] of [[0.3, 0.2], [0.4, 0.15]] as const) {
      const p = put(g, new Mesh(new CylinderGeometry(r, r, 0.09, 24), metal), sx * dx, 0, 0);
      p.rotation.z = Math.PI / 2;
    }
  }
  return g;
}

/** Miniature cast-iron dumbbell held in a hand (bar runs along x). */
function handDumbbell(iron: Material, plate: Material): Group {
  const g = new Group();
  const bar = put(g, new Mesh(new CylinderGeometry(0.03, 0.03, 0.46, 10), iron));
  bar.rotation.z = Math.PI / 2;
  for (const sx of [-1, 1]) {
    for (const [dx, r] of [[0.16, 0.12], [0.22, 0.09]] as const) {
      const p = put(g, new Mesh(new CylinderGeometry(r, r, 0.06, 18), plate), sx * dx, 0, 0);
      p.rotation.z = Math.PI / 2;
    }
  }
  return g;
}

/** Procedural cub built from primitives. stage: 0 Rookie Cub, 1 Iron Lifter, 2 Heavyweight Guardian, 3 Olympian Titan. */
export function buildPet(stage: number, accent: string): PetModel {
  const s = Math.max(0, Math.min(3, Math.round(stage)));
  const ticks: Array<(t: number, dt: number) => void> = [];
  const pet = new Group();
  pet.name = "pet";
  const root = put(pet, new Group(), 0, -PET_PIVOT, 0);
  const body = put(root, new Group());

  const fur = mat("#f0b982");
  const furDark = mat("#e2a06a");
  const belly = mat("#ffe2bd");
  const pink = mat("#f58fa5", { roughness: 0.7 });
  const dark = mat("#231a2b", { roughness: 0.25 });
  const white = mat("#ffffff", { roughness: 0.2 });
  const accentMat = mat(accent, { roughness: 0.35, metalness: 0.3, emissive: accent, emissiveIntensity: 0.25 });
  const glow = mat(accent, { emissive: accent, emissiveIntensity: 2.2, roughness: 0.3 });
  const metal = mat("#6b7280", { metalness: 0.85, roughness: 0.32 });

  // Proportions grow with each stage.
  const bsx = 1 + 0.04 * s;
  const bsy = 1 + 0.08 * s;
  const by = 0.2 + 0.72 * bsy;
  const bodyTop = by + 0.72 * bsy;
  const hr = 0.7 - 0.03 * s;
  const hy = bodyTop + hr * 0.5;
  const ny = bodyTop - 0.05; // neck pivot; head parts are positioned relative to it
  const head = put(body, new Group(), 0, ny, 0);
  const hball = (r: number, m: Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => ball(head, r, m, x, y - ny, z, sx, sy, sz);

  ball(body, 0.72, fur, 0, by, 0, bsx, bsy, 0.95);
  ball(body, 0.5, belly, 0, by - 0.05, 0.4, 1, 1.05, 0.55);

  // Head and face
  hball(hr, fur, 0, hy, 0.05);
  const front = (x: number, y: number) => Math.sqrt(Math.max(0, hr * hr - x * x - (y - hy) * (y - hy))) + 0.05;
  const eyes: Group[] = [];
  const lids: Group[] = [];
  for (const sx of [-1, 1]) {
    const e = put(head, new Group(), sx * 0.27, hy + 0.04 - ny, front(sx * 0.27, hy + 0.04) - 0.06);
    ball(e, 0.17, white, 0, 0, 0, 1, 1, 0.6);
    ball(e, 0.11, dark, 0, 0, 0.07, 1, 1, 0.7);
    ball(e, 0.035, new MeshBasicMaterial({ color: "#ffffff" }), 0.04, 0.05, 0.14);
    ball(e, 0.018, new MeshBasicMaterial({ color: "#ffffff" }), -0.04, -0.04, 0.13);
    eyes.push(e);
    // Eyelid pivots at the top of the eye; scale y 0 = open, 1 = closed.
    const lid = put(head, new Group(), sx * 0.27, hy + 0.04 + 0.17 - ny, front(sx * 0.27, hy + 0.04) - 0.03);
    ball(lid, 0.19, fur, 0, -0.17, 0, 1.05, 0.95, 0.75);
    lid.scale.y = 0.001;
    lid.visible = false;
    lids.push(lid);
    hball(0.09, pink, sx * 0.42, hy - 0.12, front(sx * 0.42, hy - 0.12) - 0.04, 1, 0.8, 0.3);
    // Rounded ears
    hball(0.2, fur, sx * 0.43, hy + hr * 0.82, 0, 1, 1, 0.6);
    hball(0.12, pink, sx * 0.43, hy + hr * 0.82, 0.06, 1, 1, 0.4);
  }
  hball(0.06, dark, 0, hy - 0.1, front(0, hy - 0.1) - 0.01, 1.2, 0.9, 0.8);
  // Mouth: the smile arc plus a dark gape that grows as the pivot scales taller (yawn).
  const mouth = put(head, new Group(), 0, hy - 0.17 - ny, front(0, hy - 0.17));
  const smile = put(mouth, new Mesh(new TorusGeometry(0.07, 0.013, 6, 14, Math.PI), dark));
  smile.rotation.z = Math.PI;
  const gape = put(mouth, new Mesh(new SphereGeometry(0.06, 16, 12), dark), 0, 0, -0.005);
  gape.visible = false;
  ticks.push(() => {
    const k = mouth.scale.y;
    smile.scale.y = 1 / k;
    gape.visible = k > 1.05;
    gape.position.y = -0.03 / k;
    gape.scale.set(1.15, ((k - 1) * 0.42) / k, 0.4);
  });

  // Arms (shoulder > elbow > hand pivots) and legs (hip pivot carrying the foot)
  const ar = 0.15 + 0.03 * s;
  const alen = 0.32 + 0.1 * s;
  const iron = mat("#2b2f36", { metalness: 0.6, roughness: 0.5 });
  const ironPlate = mat("#3b414b", { metalness: 0.6, roughness: 0.5 });
  const arms = {} as Record<number, PetRig["armL"]>;
  const legs = {} as Record<number, Group>;
  for (const sx of [-1, 1]) {
    const shoulder = put(body, new Group(), sx * 0.7 * bsx, by + 0.25 * bsy, 0.05);
    shoulder.rotation.z = sx * 0.5;
    put(shoulder, new Mesh(new CapsuleGeometry(ar, alen * 0.5, 8, 16), fur), 0, -(0.05 + alen / 4), 0);
    const elbow = put(shoulder, new Group(), 0, -(0.05 + alen / 2 + ar * 0.3), 0);
    ball(elbow, ar * 0.98, fur, 0, 0, 0);
    put(elbow, new Mesh(new CapsuleGeometry(ar * 0.95, alen * 0.44, 8, 16), fur), 0, -alen * 0.22, 0);
    const hand = put(elbow, new Group(), 0, -(alen * 0.5 + 0.07 - ar * 0.3), 0);
    ball(hand, ar + 0.02, furDark, 0, 0, 0);
    const db = put(hand, handDumbbell(iron, ironPlate));
    db.scale.setScalar(0);
    db.visible = false;
    arms[sx] = { shoulder, elbow, hand };
    if (s >= 1) ball(shoulder, ar * 1.3, fur, 0, -0.22, 0); // defined bicep
    const leg = put(body, new Group(), sx * 0.38, 0.35, 0.22);
    ball(leg, 0.22, furDark, 0, -0.23, 0, 1, 0.55, 1.3);
    legs[sx] = leg;
  }
  const handDb = (h: Object3D) => h.children[h.children.length - 1];

  if (s === 0) {
    const band = put(head, new Mesh(new TorusGeometry(Math.sqrt(hr * hr - 0.36 * 0.36) + 0.01, 0.055, 10, 40), accentMat), 0, hy + 0.36 - ny, 0.05);
    band.rotation.x = Math.PI / 2 - 0.15;
    put(head, new Mesh(new SphereGeometry(0.07, 12, 10), accentMat), 0.5, hy + 0.32 - ny, 0.05);
  }

  if (s >= 1) {
    // Collar around the chest in the accent color
    const cy = by + 0.504 * bsy;
    const collar = put(body, new Mesh(new TorusGeometry(0.72 * bsx * 0.72 + 0.04, 0.07, 12, 40), accentMat), 0, cy, 0);
    collar.rotation.x = Math.PI / 2;
    ball(body, 0.07, glow, 0, cy - 0.01, 0.55);

    const grip = mat(accent, { roughness: 0.4, metalness: 0.2 });
    for (const sx of [-1, 1]) {
      const d = put(body, dumbbell(metal, grip), sx * 1.4, 1.5, 0.2);
      d.scale.setScalar(0.62);
      ticks.push((t) => {
        d.position.y = 1.5 + Math.sin(t * 1.8 + sx) * 0.12;
        d.rotation.z = Math.sin(t * 1.1 + sx) * 0.25;
        d.rotation.y = t * 0.6 * sx;
      });
    }
  }

  if (s >= 2) {
    const armor = mat("#94a3b8", { metalness: 0.9, roughness: 0.28, side: DoubleSide });
    for (const sx of [-1, 1]) {
      const plate = put(body, new Group(), sx * (0.72 * bsx + 0.12), by + 0.42 * bsy, 0);
      plate.rotation.z = -sx * 0.5;
      put(plate, new Mesh(new SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), armor));
      const trim = put(plate, new Mesh(new TorusGeometry(0.34, 0.025, 8, 32), accentMat));
      trim.rotation.x = Math.PI / 2;
    }
    const core = ball(body, 0.13, glow, 0, by + 0.05, 0.66);
    const frame = put(body, new Mesh(new TorusGeometry(0.19, 0.03, 10, 32), metal), 0, by + 0.05, 0.64);
    ticks.push((t) => {
      const p = 0.5 + 0.5 * Math.sin(t * 3);
      glow.emissiveIntensity = 1.4 + p * 2.2;
      core.scale.setScalar(0.92 + p * 0.18);
      frame.rotation.z = t * 0.5;
    });

    const tilt = put(body, new Group(), 0, by + 0.2, 0);
    tilt.rotation.set(1.15, 0, 0.2);
    const spin = put(tilt, new Group());
    const ring = put(spin, new Mesh(new TorusGeometry(1.55, 0.035, 10, 72), glow));
    ring.rotation.x = Math.PI / 2;
    ball(spin, 0.1, white, 1.55, 0, 0);
    ticks.push((t) => (spin.rotation.y = t * 1.1));
  }

  if (s >= 3) {
    const cx = 0;
    const cy = by + 0.2;
    const auraBack = new Mesh(new SphereGeometry(2.1, 40, 28), new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false, side: BackSide }));
    const auraFront = new Mesh(new SphereGeometry(2.25, 40, 28), new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.05, blending: AdditiveBlending, depthWrite: false }));
    put(body, auraBack, cx, cy + 0.2, 0);
    put(body, auraFront, cx, cy + 0.2, 0);
    ticks.push((t) => {
      const p = 0.5 + 0.5 * Math.sin(t * 1.4);
      (auraBack.material as MeshBasicMaterial).opacity = 0.1 + p * 0.07;
      (auraFront.material as MeshBasicMaterial).opacity = 0.04 + p * 0.03;
      auraFront.scale.setScalar(1 + p * 0.03);
    });

    // Golden crown
    const gold = mat("#facc15", { metalness: 1, roughness: 0.22, emissive: "#b45309", emissiveIntensity: 0.35, side: DoubleSide });
    const crown = put(head, new Group(), 0, hy + hr + 0.5 - ny, 0);
    put(crown, new Mesh(new CylinderGeometry(0.34, 0.28, 0.18, 24, 1, true), gold));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      put(crown, new Mesh(new ConeGeometry(0.075, 0.26, 12), gold), Math.cos(a) * 0.31, 0.2, Math.sin(a) * 0.31);
      ball(crown, 0.035, white, Math.cos(a) * 0.31, 0.35, Math.sin(a) * 0.31);
    }
    ball(crown, 0.06, mat("#ef4444", { emissive: "#ef4444", emissiveIntensity: 0.6, roughness: 0.15 }), 0, 0, 0.33);
    ticks.push((t) => {
      crown.position.y = hy + hr + 0.5 - ny + Math.sin(t * 2) * 0.05;
      crown.rotation.y = t * 0.8;
    });

    // Twin starlight rings with sparkle points
    for (const dir of [-1, 1]) {
      const tilt = put(body, new Group(), 0, cy + 0.2, 0);
      tilt.rotation.set(Math.PI / 2 + dir * 0.7, 0, dir * 0.45);
      const spin = put(tilt, new Group());
      put(spin, new Mesh(new TorusGeometry(1.85, 0.018, 8, 96), glow));
      const pos: number[] = [];
      for (let i = 0; i < 48; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.85 + (Math.random() - 0.5) * 0.3;
        pos.push(Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.3);
      }
      const geo = new BufferGeometry();
      geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
      const pm = new PointsMaterial({ color: "#ffffff", size: 0.1, transparent: true, blending: AdditiveBlending, depthWrite: false });
      put(spin, new Points(geo, pm));
      ticks.push((t) => {
        spin.rotation.z = t * 0.5 * dir;
        pm.opacity = 0.65 + 0.35 * Math.sin(t * 4 + dir);
      });
    }
  }

  return {
    pet,
    rig: {
      root,
      body,
      head,
      armL: arms[-1],
      armR: arms[1],
      legL: legs[-1],
      legR: legs[1],
      mouth,
      lids: [lids[0], lids[1]],
      dumbbells: { left: handDb(arms[-1].hand), right: handDb(arms[1].hand) },
    },
    tick: (t, dt) => ticks.forEach((f) => f(t, dt)),
    blink: (a) => eyes.forEach((e) => (e.scale.y = 1 - 0.9 * a)),
  };
}

export function disposeObject(root: Object3D) {
  root.traverse((o) => {
    const m = o as Mesh;
    m.geometry?.dispose();
    const mats = m.material as Material | Material[] | undefined;
    if (Array.isArray(mats)) mats.forEach((x) => x.dispose());
    else mats?.dispose();
  });
}
