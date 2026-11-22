import {
  BackSide,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import type { ArenaBuild } from "./types";
import { Stage, addScaled, envTex, glow, inst, mk, rng, sprite, tex, type Inst } from "./kit";

const marbleTex = () =>
  tex(512, 512, (g, w, h) => {
    const r = rng(33);
    g.fillStyle = "#f1ede6";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) {
      const x = r() * w;
      const y = r() * h;
      const gr = g.createRadialGradient(x, y, 0, x, y, 80);
      gr.addColorStop(0, "rgba(200,200,210,0.25)");
      gr.addColorStop(1, "rgba(200,200,210,0)");
      g.fillStyle = gr;
      g.fillRect(x - 80, y - 80, 160, 160);
    }
    g.strokeStyle = "rgba(110,115,135,0.3)";
    for (let c = 0; c < 14; c++) {
      let x = r() * w;
      let y = r() * h;
      let a = r() * 6.28;
      g.lineWidth = 0.6 + r() * 2;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 16; k++) {
        a += (r() - 0.5) * 1.1;
        x += Math.cos(a) * 22;
        y += Math.sin(a) * 22;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });

/** Tangent-space normal strip: 16 concave flutes around the shaft. */
const fluteTex = () =>
  tex(
    256,
    4,
    (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const nx = Math.sin(((x % 16) / 16) * Math.PI * 2) * 0.7;
        g.fillStyle = `rgb(${Math.round(128 + 127 * nx)},128,${Math.round(255 * Math.sqrt(1 - nx * nx))})`;
        g.fillRect(x, 0, 1, h);
      }
    },
    { srgb: false },
  );

const flameTex = () =>
  tex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.55, w * 0.46);
    gr.addColorStop(0, "rgba(255,245,200,1)");
    gr.addColorStop(0.35, "rgba(255,170,50,0.85)");
    gr.addColorStop(1, "rgba(255,80,10,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(w / 2, 4);
    g.bezierCurveTo(w * 0.95, h * 0.5, w * 0.8, h, w / 2, h);
    g.bezierCurveTo(w * 0.2, h, w * 0.05, h * 0.5, w / 2, 4);
    g.fill();
  });

const cloudTex = () =>
  tex(256, 256, (g, w, h) => {
    const r = rng(2);
    for (let i = 0; i < 9; i++) {
      const x = w * (0.25 + r() * 0.5);
      const y = h * (0.35 + r() * 0.3);
      const rad = 50 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(255,255,255,0.55)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
  });

export function buildOlympus(): ArenaBuild {
  const s = new Stage();
  const env = envTex(
    [
      [0, "#ffb070"],
      [0.5, "#7a4a60"],
      [1, "#2a2038"],
    ],
    [{ y: 0.3, h: 0.1, c: "#fff1c8", x: 0.4, w: 0.2 }],
  );

  // Marble floor disc with gold inlay
  const marble = marbleTex();
  const marbleMat = new MeshStandardMaterial({ map: marble, color: 0xf4efe8, roughness: 0.3, metalness: 0.05 });
  const disc = mk(new CylinderGeometry(4.8, 4.8, 0.4, 64), marbleMat, 0, -0.2, -0.3);
  const gold = new MeshStandardMaterial({ color: 0xd4a63a, emissive: 0x5a3f08, emissiveIntensity: 0.6, metalness: 1, roughness: 0.3, envMap: env });
  const ringA = mk(new RingGeometry(3.7, 3.95, 64), gold, 0, 0.012, -0.3);
  const ringB = mk(new RingGeometry(2.2, 2.28, 64), gold, 0, 0.012, -0.3);
  ringA.rotation.x = ringB.rotation.x = -Math.PI / 2;
  s.add(disc, ringA, ringB);

  // Fluted columns in a semicircle, with a broken entablature
  const flutes = fluteTex();
  const colMat = new MeshStandardMaterial({ color: 0xf2ece2, roughness: 0.35, normalMap: flutes });
  const R = 4.1;
  const angles = [-72, -48, -24, 0, 24, 48, 72].map((d) => (d * Math.PI) / 180);
  const pt = (a: number) => new Vector3(Math.sin(a) * R, 0, -Math.cos(a) * R);
  const shafts: Inst[] = [];
  const bases: Inst[] = [];
  const caps: Inst[] = [];
  angles.forEach((a, i) => {
    const p = pt(a);
    const broken = i === 5;
    shafts.push({ p: [p.x, 0.25 + (broken ? 0.8 : 1.8), p.z], s: [1, broken ? 0.45 : 1, 1] });
    bases.push({ p: [p.x, 0.125, p.z], r: [0, -a, 0] });
    if (!broken) caps.push({ p: [p.x, 3.95, p.z], r: [0, -a, 0] });
  });
  shafts.push({ p: [2.3, 0.34, -1.9], r: [0, 0.5, Math.PI / 2], s: [1, 0.6, 1] }); // fallen drum
  s.add(
    inst(new CylinderGeometry(0.3, 0.34, 3.6, 18), colMat, shafts),
    inst(new BoxGeometry(0.9, 0.25, 0.9), marbleMat, bases),
    inst(new BoxGeometry(0.85, 0.22, 0.85), marbleMat, caps),
  );
  const beams: Inst[] = [];
  for (let i = 0; i < 6; i++) {
    if (i === 2 || i === 4 || i === 5) continue; // gaps in the entablature
    const a = pt(angles[i]);
    const b = pt(angles[i + 1]);
    beams.push({ p: [(a.x + b.x) / 2, 4.28, (a.z + b.z) / 2], r: [0, -Math.atan2(b.z - a.z, b.x - a.x), 0] });
  }
  const stub = pt(angles[2]);
  beams.push({ p: [stub.x + 0.45, 4.28, stub.z + 0.2], r: [0, -0.2, 0], s: [0.5, 1, 1] });
  beams.push({ p: [-2.5, 0.2, -2.0], r: [0.05, 0.6, 0.1], s: [1.1, 0.8, 1] }); // fallen block
  s.add(inst(new BoxGeometry(1.75, 0.4, 0.7), marbleMat, beams));

  // Golden braziers with animated flames
  const bowl = new LatheGeometry(
    [new Vector2(0.001, 0), new Vector2(0.16, 0.03), new Vector2(0.34, 0.14), new Vector2(0.48, 0.36), new Vector2(0.52, 0.42), new Vector2(0.46, 0.43), new Vector2(0.38, 0.26), new Vector2(0.001, 0.2)],
    20,
  );
  const stem = new CylinderGeometry(0.08, 0.12, 0.9, 10);
  const foot = new CylinderGeometry(0.28, 0.34, 0.15, 14);
  const fMap = flameTex();
  const lights: PointLightRef[] = [];
  const flames: { sp: ReturnType<typeof sprite>; bx: number; by: number; k: number; ph: number }[] = [];
  for (const [i, x] of [-2.7, 2.7].entries()) {
    const z = -1.3;
    s.add(mk(foot, gold, x, 0.075, z), mk(stem, gold, x, 0.6, z), mk(bowl, gold, x, 1.05, z));
    for (let k = 0; k < 4; k++) {
      const sp = sprite(fMap, k < 2 ? "#ff7a1a" : "#ffd27a", k < 2 ? 0.9 : 0.8);
      const bx = x + (k % 2 ? 0.1 : -0.1);
      const by = 1.7 + (k >= 2 ? 0.05 : 0);
      sp.position.set(bx, by, z);
      flames.push({ sp, bx, by, k, ph: i * 1.7 + k * 0.9 });
      s.add(sp);
    }
    const L = new PointLight(0xff8a2a, 22, 10, 2);
    L.position.set(x, 1.9, z + 0.3);
    lights.push({ L, ph: i * 2 });
    s.add(L);
  }
  s.ticks.push((t) => {
    for (const f of flames) {
      const w = 0.5 + 0.5 * Math.sin(t * (7 + f.k * 1.3) + f.ph);
      const size = (f.k < 2 ? 0.95 : 0.55) * (0.85 + 0.25 * w);
      f.sp.scale.set(size * 0.75, size, 1);
      f.sp.position.set(f.bx + Math.sin(t * 5 + f.ph) * 0.03, f.by + size * 0.35, f.sp.position.z);
      f.sp.material.opacity = 0.7 + 0.25 * w;
    }
    for (const l of lights) l.L.intensity = 22 * (0.85 + 0.1 * Math.sin(t * 9 + l.ph) + 0.05 * Math.sin(t * 17 + l.ph * 2));
  });

  // Sunset sky dome and sun glow
  const dome = new SphereGeometry(40, 32, 16);
  const dp = dome.attributes.position;
  const sc = new Float32Array(dp.count * 3);
  const stops = [
    [-1, new Color("#7a3a5a")],
    [0, new Color("#ff9a5c")],
    [0.25, new Color("#d96a6a")],
    [0.6, new Color("#6b4590")],
    [1, new Color("#1f2250")],
  ] as const;
  const sunDir = new Vector3(0, 0.08, -1).normalize();
  const c = new Color();
  const sunGlow = new Color("#ffc878");
  const v = new Vector3();
  for (let i = 0; i < dp.count; i++) {
    v.fromBufferAttribute(dp, i).normalize();
    let k = 0;
    while (k < stops.length - 2 && v.y > stops[k + 1][0]) k++;
    const [y0, c0] = stops[k];
    const [y1, c1] = stops[k + 1];
    c.copy(c0).lerp(c1, Math.min(1, Math.max(0, (v.y - y0) / (y1 - y0))));
    addScaled(c, sunGlow, Math.pow(Math.max(0, v.dot(sunDir)), 6) * 0.7);
    sc[i * 3] = c.r;
    sc[i * 3 + 1] = c.g;
    sc[i * 3 + 2] = c.b;
  }
  dome.setAttribute("color", new Float32BufferAttribute(sc, 3));
  const sky = new Mesh(dome, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false }));
  sky.name = "env:sky";
  const sun = sprite(glow("rgba(255,220,150,1)", "rgba(255,150,60,0)", 256), "#ffd9a0", 0.9);
  sun.scale.setScalar(22);
  sun.position.set(0, 4, -34);
  s.add(sky, sun);

  // Cloud sea below the floor edge
  const cMap = cloudTex();
  const r = rng(12);
  const clouds = Array.from({ length: 16 }, (_, i) => {
    const sp = sprite(cMap, i % 3 ? "#ffd2c0" : "#ffe8d8", 0.8, false);
    sp.name = "env:cloud";
    const rad = 6 + r() * 8;
    const a = (i / 16) * Math.PI * 2 + r() * 0.3;
    const y = -0.6 - r() * 2;
    sp.scale.set(5 + r() * 3, 3 + r() * 1.5, 1);
    return { sp, rad, a, y, sp2: 0.01 + r() * 0.025 };
  });
  clouds.forEach((cl) => s.add(cl.sp));
  s.ticks.push((t) => {
    for (const cl of clouds) {
      const a = cl.a + t * cl.sp2;
      cl.sp.position.set(Math.sin(a) * cl.rad, cl.y, -Math.cos(a) * cl.rad);
    }
  });

  return s.build("olympus", "#7a3a5a", { color: "#c9774f", near: 16, far: 46 });
}

interface PointLightRef {
  L: PointLight;
  ph: number;
}
