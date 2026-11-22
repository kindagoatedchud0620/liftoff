import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Group,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Path,
  Points,
  PointsMaterial,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Texture,
} from "three";
import type { MeshPhysicalMaterialParameters } from "three";

/** What a tier builder hands back. `group` is the assembled crest, `fx` holds particles and glows. */
export interface Built {
  group: Group;
  fx: Group;
  tick: (t: number, dt: number) => void;
  rim?: string;
}

export type Pt = [number, number];

export function newBuilt() {
  const group = new Group();
  group.name = "badge";
  const fx = new Group();
  fx.name = "fx";
  return { group, fx };
}

export function poly(pts: Pt[], s = 1): Shape {
  const sh = new Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s)));
  sh.closePath();
  return sh;
}

/** Regular polygon, first vertex at `rot` radians from +x. */
export function ngon(n: number, r: number, rot = Math.PI / 2): Shape {
  return poly(Array.from({ length: n }, (_, i) => [Math.cos(rot + (i / n) * Math.PI * 2) * r, Math.sin(rot + (i / n) * Math.PI * 2) * r] as Pt));
}

/** Pointed star with `n` tips. */
export function star(n: number, outer: number, inner: number, rot = Math.PI / 2): Shape {
  return poly(
    Array.from({ length: n * 2 }, (_, i) => {
      const r = i % 2 ? inner : outer;
      const a = rot + (i / (n * 2)) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
    }),
  );
}

/** Pointing +x, root at the origin. */
export function feather(len: number, wid: number): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(len * 0.3, wid, len * 0.8, wid * 0.75, len, 0);
  s.bezierCurveTo(len * 0.8, -wid * 0.35, len * 0.3, -wid * 0.55, 0, 0);
  return s;
}

/** A shape with a hole cut from the same outline at another size: a raised frame. */
export function framed(fn: (s: number) => Shape, outer: number, inner: number): Shape {
  const sh = fn(outer);
  sh.holes.push(new Path(fn(inner).getPoints(24)));
  return sh;
}

export function extGeo(shape: Shape, depth: number, bevel = 0.04): ExtrudeGeometry {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export const ext = (shape: Shape, depth: number, mat: Material, bevel = 0.04) => new Mesh(extGeo(shape, depth, bevel), mat);

export const phys = (color: string, o: MeshPhysicalMaterialParameters = {}) => new MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.3, ...o });

export function at<T extends Object3D>(o: T, x = 0, y = 0, z = 0, rz = 0): T {
  o.position.set(x, y, z);
  o.rotation.z = rz;
  return o;
}

/** Canvas texture mapped onto extruded fronts (their UVs are raw x,y), so repeat and offset recentre it. */
export function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: number, srgb = true): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (g) draw(g, size);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.offset.set(0.5, 0.5);
  if (srgb) t.colorSpace = SRGBColorSpace;
  return t;
}

export function glowTex(inner: string, outer = "rgba(255,255,255,0)"): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, inner);
    r.addColorStop(1, outer);
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Additive point cloud. "rise" floats upward and wraps, "orbit" circles the crest. Motion is a pure function of time. */
export function particles(o: { count: number; color: string; size: number; mode: "rise" | "orbit"; spread: number; speed: number; opacity?: number }) {
  const { count, spread, speed, mode } = o;
  const pos = new Float32Array(count * 3);
  const seed = Array.from({ length: count }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
  const geo = new BufferGeometry();
  const attr = new BufferAttribute(pos, 3);
  geo.setAttribute("position", attr);
  const mat = new PointsMaterial({
    color: o.color,
    size: o.size,
    map: glowTex("rgba(255,255,255,1)"),
    transparent: true,
    opacity: o.opacity ?? 1,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  const tick = (t: number) => {
    for (let i = 0; i < count; i++) {
      const [a, b, c, d] = seed[i];
      if (mode === "rise") {
        pos[i * 3] = (a - 0.5) * spread * 1.8 + Math.sin(t * 1.4 + c * 6.28) * 0.08;
        pos[i * 3 + 1] = ((d + t * speed * (0.3 + b * 0.7)) % 1) * spread * 2.4 - spread;
        pos[i * 3 + 2] = (c - 0.5) * 0.8;
      } else {
        const ang = a * Math.PI * 2 + t * speed * (0.4 + b);
        const r = spread * (0.65 + c * 0.55);
        pos[i * 3] = Math.cos(ang) * r;
        pos[i * 3 + 1] = (d - 0.5) * spread * 1.7 + Math.sin(t * 0.8 + a * 9) * 0.1;
        pos[i * 3 + 2] = Math.sin(ang) * r * 0.6;
      }
    }
    attr.needsUpdate = true;
  };
  tick(0);
  return { points: pts, tick };
}

/** Frees geometries, materials and their textures. Sprites share one internal geometry, which is left alone. */
export function disposeDeep(root: Object3D) {
  root.traverse((o) => {
    const m = o as Mesh;
    if (!(o as { isSprite?: boolean }).isSprite) m.geometry?.dispose();
    const mats = m.material as Material | Material[] | undefined;
    for (const mat of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      for (const v of Object.values(mat)) if (v && (v as Texture).isTexture) (v as Texture).dispose();
      mat.dispose();
    }
  });
}

/** One fan of overlapping individually extruded feathers. `s` is the side (1 right, -1 left). */
export function fanWing(
  group: Group,
  o: { s: 1 | -1; x: number; y: number; z: number; n: number; a0: number; a1: number; len0: number; len1: number; wid: number; mat: (i: number) => Material; depth?: number },
) {
  for (let i = 0; i < o.n; i++) {
    const k = o.n > 1 ? i / (o.n - 1) : 0;
    const a = ((o.a0 + (o.a1 - o.a0) * k) * Math.PI) / 180;
    const m = ext(feather(o.len0 + (o.len1 - o.len0) * k, o.wid * (0.9 + 0.3 * k)), o.depth ?? 0.04, o.mat(i), 0.015);
    m.position.set(o.s * o.x, o.y, o.z + i * 0.012);
    m.rotation.z = a * o.s; // mirrored feathers flip x, so the angle flips with them
    m.scale.x = o.s;
    group.add(m);
  }
}
