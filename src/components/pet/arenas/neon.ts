import {
  AdditiveBlending,
  BackSide,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  Vector2,
} from "three";
import type { ArenaBuild } from "./types";
import { Stage, addScaled, envTex, mk, rng, tex } from "./kit";

export function buildNeon(): ArenaBuild {
  const s = new Stage();
  const env = envTex(
    [
      [0, "#1a2a6a"],
      [0.5, "#06102a"],
      [1, "#020410"],
    ],
    [
      { y: 0.25, h: 0.05, c: "#22d3ee", x: 0.2, w: 0.2 },
      { y: 0.3, h: 0.04, c: "#818cf8", x: 0.65, w: 0.2 },
    ],
  );

  // Glossy ice floor with an emissive cyan grid
  const grid = tex(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#22d3ee";
      g.shadowColor = "#22d3ee";
      g.shadowBlur = 8;
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= 4; i++) {
        g.moveTo(i * 128, 0);
        g.lineTo(i * 128, h);
        g.moveTo(0, i * 128);
        g.lineTo(w, i * 128);
      }
      g.stroke();
    },
    { repeat: [5.6, 7.95] },
  );
  const floorMat = new MeshPhysicalMaterial({ color: 0x06141f, roughness: 0.12, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x22d3ee, emissiveMap: grid, emissiveIntensity: 0.8, envMap: env, envMapIntensity: 0.9 });
  const floor = mk(new PlaneGeometry(14, 20), floorMat, 0, 0, 5.1); // reaches under the camera
  floor.rotation.x = -Math.PI / 2;
  s.add(floor);

  // Curved aurora backdrop (vertex colors)
  const R = 4.8;
  const H = 7;
  const bg = new CylinderGeometry(R, R, H, 64, 24, true, Math.PI - 1.2, 2.4);
  bg.translate(0, H / 2, 0);
  const p = bg.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new Color();
  const lo = new Color("#060b25");
  const hi = new Color("#0e1c45");
  const teal = new Color("#19e6c1");
  const violet = new Color("#8b5cf6");
  for (let i = 0; i < p.count; i++) {
    const v = p.getY(i) / H;
    const ang = Math.atan2(p.getX(i), -p.getZ(i));
    const band = Math.pow(Math.sin(ang * 3 + v * 5 + 1.2) * 0.5 + 0.5, 3) * Math.min(1, Math.max(0, (v - 0.12) / 0.4)) * (1 - v * 0.55);
    c.copy(lo).lerp(hi, v);
    addScaled(c, new Color().copy(teal).lerp(violet, Math.sin(ang * 2) * 0.5 + 0.5), band * 0.55);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  bg.setAttribute("color", new Float32BufferAttribute(col, 3));
  const backdrop = new Mesh(bg, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false }));
  backdrop.name = "env:backdrop";
  s.add(backdrop);

  // Faceted crystal pillars
  const mkCrystal = (h: number, rad: number) => {
    const pts = [new Vector2(0.001, 0), new Vector2(rad, 0), new Vector2(rad * 0.9, h * 0.72), new Vector2(0.001, h)];
    return new LatheGeometry(pts, 6);
  };
  const crystalMat = (color: number, em: number) =>
    new MeshPhysicalMaterial({ color, emissive: em, emissiveIntensity: 0.7, flatShading: true, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0, depthWrite: false, envMap: env });
  const matC = crystalMat(0x7fd8ff, 0x0e7490);
  const matI = crystalMat(0x9aa8ff, 0x3730a3);
  const edgeC = new LineBasicMaterial({ color: 0x22d3ee });
  const edgeI = new LineBasicMaterial({ color: 0x818cf8 });
  const geos = [mkCrystal(3.6, 0.5), mkCrystal(2.4, 0.38), mkCrystal(1.6, 0.3)];
  const edges = geos.map((g) => new EdgesGeometry(g, 20));
  const r = rng(9);
  const spots: [number, number, number, number][] = [
    [-3.6, -2.2, 0, 0],
    [-3.0, -3.4, 1, 1],
    [-4.1, -0.8, 2, 0],
    [3.5, -2.4, 0, 1],
    [4.0, -1.0, 1, 0],
    [2.9, -3.6, 2, 1],
    [-1.9, -4.1, 1, 0],
    [1.9, -4.2, 2, 1],
  ];
  for (const [x, z, k, tone] of spots) {
    const cr = mk(geos[k], tone ? matI : matC, x, -0.05, z);
    cr.rotation.set((r() - 0.5) * 0.24, r() * 6.28, (r() - 0.5) * 0.24);
    const ed = new LineSegments(edges[k], tone ? edgeI : edgeC);
    cr.add(ed);
    s.add(cr);
  }

  // Floating hexagon light panels
  const hexGeo = new CircleGeometry(0.55, 6);
  const rimGeo = new RingGeometry(0.5, 0.58, 6);
  const hexMats = [new MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false }), new MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false })];
  const rimMats = [new MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false }), new MeshBasicMaterial({ color: 0xa5b4fc, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false })];
  const hexes = [
    [-48, 2.2, 0.9],
    [-30, 3.6, 0.7],
    [-8, 2.9, 1.1],
    [14, 4.1, 0.8],
    [34, 2.5, 1],
    [52, 3.7, 0.7],
  ].map(([deg, y, sc], i) => {
    const a = (deg * Math.PI) / 180;
    const h = mk(hexGeo, hexMats[i % 2], Math.sin(a) * 4.3, y, -Math.cos(a) * 4.3);
    h.add(mk(rimGeo, rimMats[i % 2]));
    h.rotation.y = -a;
    h.scale.setScalar(sc);
    return { h, y, sp: (i % 2 ? 1 : -1) * (0.1 + 0.05 * i), ph: i * 1.3 };
  });
  hexes.forEach((x) => s.add(x.h));
  s.ticks.push((t) => {
    for (const x of hexes) {
      x.h.rotation.z = t * x.sp;
      x.h.position.y = x.y + Math.sin(t * 0.6 + x.ph) * 0.12;
    }
  });

  // Pulsing cool lights
  const cy = new PointLight(0x22d3ee, 30, 12, 2);
  cy.position.set(-3, 2.6, -1);
  const ind = new PointLight(0x6366f1, 30, 12, 2);
  ind.position.set(3, 2.2, -1.5);
  s.add(cy, ind);
  s.ticks.push((t) => {
    cy.intensity = 30 * (0.8 + 0.2 * Math.sin(t * 1.3));
    ind.intensity = 30 * (0.8 + 0.2 * Math.sin(t * 1.1 + 2));
    floorMat.emissiveIntensity = 0.8 + 0.15 * Math.sin(t * 1.3);
  });

  return s.build("neon", "#04060f", { color: "#04060f", near: 12, far: 30 });
}
