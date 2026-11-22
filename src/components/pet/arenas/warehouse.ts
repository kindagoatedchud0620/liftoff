import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  SphereGeometry,
} from "three";
import type { ArenaBuild } from "./types";
import { Stage, envTex, glow, inst, mk, rng, tex, type Inst } from "./kit";

const gratingTex = () =>
  tex(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = "#0a0b0d";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {
        const p = i * 32;
        g.fillStyle = "#9aa2aa";
        g.fillRect(p, 0, 5, h);
        g.fillStyle = "#59616a";
        g.fillRect(0, p, w, 5);
        g.fillStyle = "#d8dee4";
        g.fillRect(p, 0, 1.5, h);
      }
    },
    { repeat: [3.5, 5] },
  );

const brickTex = () =>
  tex(
    512,
    512,
    (g, w, h) => {
      const r = rng(21);
      g.fillStyle = "#3b3835";
      g.fillRect(0, 0, w, h);
      for (let row = 0; row < 16; row++) {
        for (let c = -1; c < 8; c++) {
          const x = c * 64 + (row % 2 ? 32 : 0);
          g.fillStyle = `hsl(${10 + r() * 14}, ${30 + r() * 15}%, ${26 + r() * 12}%)`;
          g.fillRect(x + 2, row * 32 + 2, 60, 28);
        }
      }
      for (let i = 0; i < 40; i++) {
        const x = r() * w;
        const gr = g.createLinearGradient(0, 0, 0, 200 + r() * 200);
        gr.addColorStop(0, "rgba(10,8,6,0.5)");
        gr.addColorStop(1, "rgba(10,8,6,0)");
        g.fillStyle = gr;
        g.fillRect(x, 0, 6 + r() * 14, 400);
      }
      for (let i = 0; i < 1500; i++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.18})`;
        g.fillRect(r() * w, r() * h, 2, 2);
      }
    },
    { repeat: [2, 1] },
  );

export function buildWarehouse(): ArenaBuild {
  const s = new Stage();
  const env = envTex(
    [
      [0, "#4c5c70"],
      [0.5, "#1b222b"],
      [1, "#07090c"],
    ],
    [
      { y: 0.18, h: 0.07, c: "#dff0ff", x: 0.1, w: 0.12 },
      { y: 0.18, h: 0.07, c: "#dff0ff", x: 0.5, w: 0.12 },
      { y: 0.18, h: 0.07, c: "#dff0ff", x: 0.8, w: 0.12 },
    ],
  );

  // Brushed steel grating floor and brick wall
  const grating = gratingTex();
  const floor = mk(new PlaneGeometry(14, 20), new MeshStandardMaterial({ map: grating, metalness: 0.85, roughness: 0.4, envMap: env, envMapIntensity: 1.2 }), 0, 0, 5.1); // reaches under the camera
  floor.rotation.x = -Math.PI / 2;
  const brick = brickTex();
  const wall = mk(new PlaneGeometry(10, 5), new MeshStandardMaterial({ map: brick, bumpMap: brick, bumpScale: 3, roughness: 0.95, color: 0xb0a8a0 }), 0, 2.5, -4.6);
  s.add(floor, wall);

  // Power rack
  const steel = new MeshStandardMaterial({ color: 0x3a4048, metalness: 0.8, roughness: 0.45, envMap: env });
  const up = (x: number, z: number): Inst => ({ p: [x, 2.1, z] });
  s.add(inst(new BoxGeometry(0.2, 4.2, 0.2), steel, [up(-2.1, -2.9), up(2.1, -2.9), up(-2.1, -3.7), up(2.1, -3.7)]));
  s.add(inst(new BoxGeometry(4.4, 0.18, 0.18), steel, [{ p: [0, 4.1, -2.9] }, { p: [0, 4.1, -3.7] }, { p: [0, 2.9, -3.7] }, { p: [0, 0.9, -3.7] }]));
  s.add(inst(new BoxGeometry(0.18, 0.18, 0.8), steel, [{ p: [-2.1, 4.1, -3.3] }, { p: [2.1, 4.1, -3.3] }, { p: [-2.1, 0.09, -3.3] }, { p: [2.1, 0.09, -3.3] }]));
  const hookY = 2.35;
  s.add(inst(new BoxGeometry(0.14, 0.08, 0.26), steel, [{ p: [-1.92, hookY, -2.75] }, { p: [1.92, hookY, -2.75] }]));
  s.add(inst(new BoxGeometry(0.14, 0.2, 0.05), steel, [{ p: [-1.92, hookY + 0.07, -2.64] }, { p: [1.92, hookY + 0.07, -2.64] }]));
  const bar = new MeshStandardMaterial({ color: 0xc8cdd2, metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 1.3 });
  const bbY = hookY + 0.18;
  const barbell = mk(new CylinderGeometry(0.03, 0.03, 5.4, 10), bar, 0, bbY, -2.75);
  barbell.rotation.z = Math.PI / 2;
  s.add(barbell);
  const plate = new MeshStandardMaterial({ color: 0x15181b, metalness: 0.6, roughness: 0.5, envMap: env });
  const pl: Inst[] = [];
  for (const sx of [-1, 1]) for (const d of [2.45, 2.6]) pl.push({ p: [sx * d, bbY, -2.75], r: [0, 0, Math.PI / 2], s: [0.55, 0.1, 0.55] });
  s.add(inst(new CylinderGeometry(1, 1, 1, 28), plate, pl));
  s.add(inst(new CylinderGeometry(0.055, 0.055, 0.5, 10), bar, [{ p: [-2.5, bbY, -2.75], r: [0, 0, Math.PI / 2] }, { p: [2.5, bbY, -2.75], r: [0, 0, Math.PI / 2] }]));

  // Dumbbell rack
  const rack = new Group();
  rack.position.set(-3.7, 0, -1.6);
  rack.rotation.y = 0.4;
  const frame = new MeshStandardMaterial({ color: 0x23272c, metalness: 0.7, roughness: 0.5 });
  rack.add(
    inst(new BoxGeometry(0.08, 1.1, 0.08), frame, [
      { p: [-0.8, 0.55, -0.25] },
      { p: [0.8, 0.55, -0.25] },
      { p: [-0.8, 0.55, 0.25] },
      { p: [0.8, 0.55, 0.25] },
    ]),
    inst(new BoxGeometry(1.7, 0.06, 0.56), frame, [{ p: [0, 0.5, 0] }, { p: [0, 1.05, 0] }]),
  );
  const chrome = new MeshStandardMaterial({ color: 0xe6eaee, metalness: 1, roughness: 0.08, envMap: env, envMapIntensity: 1.6 });
  const handles: Inst[] = [];
  const heads: Inst[] = [];
  [0.5, 1.05].forEach((sy, row) => {
    for (let i = 0; i < 4; i++) {
      const x = -0.6 + i * 0.4;
      const y = sy + 0.03 + 0.13;
      const rad = 0.11 + (i + row * 2) * 0.012;
      handles.push({ p: [x, y, 0], r: [Math.PI / 2, 0, 0], s: [0.03, 0.46, 0.03] });
      for (const sz of [-1, 1]) heads.push({ p: [x, y, sz * 0.17], r: [Math.PI / 2, 0, 0], s: [rad, 0.11, rad] });
    }
  });
  rack.add(inst(new CylinderGeometry(1, 1, 1, 10), chrome, handles), inst(new CylinderGeometry(1, 1, 1, 6), chrome, heads));
  s.add(rack);

  // Industrial lamps with light shafts
  const shadeMat = new MeshStandardMaterial({ color: 0x252b32, metalness: 0.7, roughness: 0.5, side: DoubleSide });
  const lampGlow = new MeshBasicMaterial({ color: 0xdff3ff });
  const cordMat = new MeshBasicMaterial({ color: 0x08090a });
  const shaftGeo = new ConeGeometry(1.3, 4.3, 24, 1, true);
  const col = new Float32Array(shaftGeo.attributes.position.count * 3);
  for (let i = 0; i < shaftGeo.attributes.position.count; i++) {
    const k = (shaftGeo.attributes.position.getY(i) + 2.15) / 4.3; // 0 at the base, 1 at the lamp
    col.fill(0.03 + 0.2 * k * k, i * 3, i * 3 + 3);
  }
  shaftGeo.setAttribute("color", new BufferAttribute(col, 3));
  const shaftMat = new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false, color: 0xbfdcff });
  const shadeGeo = new ConeGeometry(0.45, 0.35, 20, 1, true);
  const bulbGeo = new SphereGeometry(0.15, 10, 8);
  const cordGeo = new CylinderGeometry(0.012, 0.012, 1.6, 5);
  for (const [x, z] of [[-3, -1.8], [3, -1.8], [0, -3.9]]) {
    s.add(
      mk(shadeGeo, shadeMat, x, 4.3, z),
      mk(bulbGeo, lampGlow, x, 4.15, z),
      mk(cordGeo, cordMat, x, 5.2, z),
      mk(shaftGeo, shaftMat, x, 4.3 - 2.15, z),
    );
  }
  const l1 = new PointLight(0xcfe6ff, 26, 14, 2);
  l1.position.set(-3, 3.9, -1.5);
  const l2 = new PointLight(0xcfe6ff, 26, 14, 2);
  l2.position.set(3, 3.9, -1.5);
  s.add(l1, l2);
  s.ticks.push((t) => {
    l1.intensity = 26 * (0.97 + 0.03 * Math.sin(t * 7.1));
    l2.intensity = 26 * (0.97 + 0.03 * Math.sin(t * 6.3 + 2));
  });

  // Drifting dust
  const N = 130;
  const base = new Float32Array(N * 4);
  const r = rng(5);
  for (let i = 0; i < N; i++) {
    base[i * 4] = (r() - 0.5) * 9;
    base[i * 4 + 1] = r() * 4.3;
    base[i * 4 + 2] = -4 + r() * 7;
    base[i * 4 + 3] = r() * 6.28;
  }
  const pos = new Float32Array(N * 3);
  const dustGeo = new BufferGeometry();
  const attr = new Float32BufferAttribute(pos, 3);
  dustGeo.setAttribute("position", attr);
  const dust = new Points(dustGeo, new PointsMaterial({ color: 0xcfe0ff, size: 0.06, map: glow("rgba(255,255,255,1)"), transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending }));
  dust.frustumCulled = false;
  const step = (t: number) => {
    for (let i = 0; i < N; i++) {
      const ph = base[i * 4 + 3];
      pos[i * 3] = base[i * 4] + Math.sin(t * 0.2 + ph) * 0.4;
      pos[i * 3 + 1] = 0.3 + ((base[i * 4 + 1] + t * 0.04 * (1 + (ph % 1))) % 4.3);
      pos[i * 3 + 2] = base[i * 4 + 2] + Math.cos(t * 0.17 + ph) * 0.3;
    }
    attr.needsUpdate = true;
  };
  step(0);
  s.add(dust);
  s.ticks.push(step);

  return s.build("warehouse", "#07090c", { color: "#07090c", near: 10, far: 26 });
}
