import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  EquirectangularReflectionMapping,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  AdditiveBlending,
  NormalBlending,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import { disposeDeep } from "@/components/ranks/three/kit";
import type { ArenaBuild } from "./types";
import type { ArenaId } from "@/lib/arenas";

/** Small seeded random generator so every build looks the same. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** Canvas texture (small sizes only). Falls back to a 1x1 texture where there is no document (scripts). */
export function tex(w: number, h: number, draw: Draw, o: { repeat?: [number, number]; srgb?: boolean } = {}): Texture {
  let t: Texture;
  if (typeof document === "undefined") {
    t = new DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1, RGBAFormat);
    t.needsUpdate = true;
  } else {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    if (g) draw(g, w, h);
    t = new CanvasTexture(c);
  }
  t.wrapS = t.wrapT = RepeatWrapping;
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  if (o.srgb !== false) t.colorSpace = SRGBColorSpace;
  return t;
}

/** Soft radial glow, used for sprites, light pools and dust. */
export function glow(inner: string, outer = "rgba(255,255,255,0)", size = 128): Texture {
  return tex(size, size, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, inner);
    r.addColorStop(1, outer);
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });
}

/** Tiny equirectangular environment: a vertical gradient with bright strips, for metal and gloss to reflect. */
export function envTex(stops: [number, string][], strips: { y: number; h: number; c: string; x?: number; w?: number }[]): Texture {
  const t = tex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    for (const [p, c] of stops) gr.addColorStop(p, c);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (const s of strips) {
      g.fillStyle = s.c;
      g.fillRect((s.x ?? 0) * w, s.y * h, (s.w ?? 1) * w, s.h * h);
    }
  });
  t.mapping = EquirectangularReflectionMapping;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  return t;
}

export const mk = <G extends BufferGeometry, M extends Material>(g: G, m: M, x = 0, y = 0, z = 0) => {
  const o = new Mesh(g, m);
  o.position.set(x, y, z);
  return o;
};

export interface Inst {
  p: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number];
  c?: string;
}

/** One draw call for many copies of a geometry. */
export function inst(g: BufferGeometry, m: Material, items: Inst[]) {
  const im = new InstancedMesh(g, m, items.length);
  const d = new Object3D();
  items.forEach((it, i) => {
    d.position.set(...it.p);
    d.rotation.set(...(it.r ?? [0, 0, 0]));
    d.scale.set(...(it.s ?? [1, 1, 1]));
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    if (it.c) im.setColorAt(i, new Color(it.c));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingBox();
  im.frustumCulled = false;
  return im;
}

export function sprite(map: Texture, color: string, opacity = 1, additive = true) {
  const s = new Sprite(new SpriteMaterial({ map, color, opacity, transparent: true, depthWrite: false, fog: false, blending: additive ? AdditiveBlending : NormalBlending }));
  return s;
}

export class Stage {
  group = new Group();
  ticks: Array<(t: number, dt: number) => void> = [];
  add(...o: Object3D[]) {
    this.group.add(...o);
  }
  build(id: ArenaId, background: string, fog?: { color: string; near: number; far: number }): ArenaBuild {
    return {
      id,
      group: this.group,
      background: new Color(background),
      fog: fog && { color: new Color(fog.color), near: fog.near, far: fog.far },
      tick: (t, dt) => {
        const d = Math.max(0, Math.min(0.1, dt || 0));
        for (const f of this.ticks) f(t, d);
      },
      dispose: () => {
        this.group.traverse((o) => (o as InstancedMesh).isInstancedMesh && (o as InstancedMesh).dispose());
        disposeDeep(this.group);
        this.group.clear();
      },
    };
  }
}

/** c += o * k (Color has no scaled add in this three version). */
export function addScaled(c: Color, o: Color, k: number) {
  c.r += o.r * k;
  c.g += o.g * k;
  c.b += o.b * k;
}
