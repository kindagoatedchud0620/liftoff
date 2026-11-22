import { CylinderGeometry, Group, LatheGeometry, Mesh, OctahedronGeometry, PointLight, Shape, SphereGeometry, TorusGeometry, Vector2 } from "three";
import { at, canvasTex, ext, extGeo, fanWing, framed, newBuilt, ngon, particles, phys, poly, star, type Built, type Pt } from "./kit";

/** Heater shield, scaled about the origin. */
export const heater = (s = 1): Shape => {
  const sh = new Shape();
  sh.moveTo(-0.85 * s, s);
  sh.lineTo(0.85 * s, s);
  sh.lineTo(0.85 * s, 0.1 * s);
  sh.bezierCurveTo(0.85 * s, -0.6 * s, 0.4 * s, -s, 0, -1.2 * s);
  sh.bezierCurveTo(-0.4 * s, -s, -0.85 * s, -0.6 * s, -0.85 * s, 0.1 * s);
  sh.closePath();
  return sh;
};

const kite = (s = 1): Shape => {
  const sh = new Shape();
  sh.moveTo(0, 1.25 * s);
  sh.lineTo(0.8 * s, 0.8 * s);
  sh.lineTo(0.8 * s, -0.05 * s);
  sh.bezierCurveTo(0.8 * s, -0.7 * s, 0.3 * s, -s, 0, -1.3 * s);
  sh.bezierCurveTo(-0.3 * s, -s, -0.8 * s, -0.7 * s, -0.8 * s, -0.05 * s);
  sh.lineTo(-0.8 * s, 0.8 * s);
  sh.closePath();
  return sh;
};

/** 1 Wood, Timber Warden: carved oak shield, wrought-iron brackets, bronze acorn. */
export function buildWood(): Built {
  const { group, fx } = newBuilt();
  const grain = canvasTex(
    256,
    (g, s) => {
      g.fillStyle = "#8a5a2c";
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 46; i++) {
        g.strokeStyle = i % 3 ? "rgba(60,32,12,.45)" : "rgba(40,20,8,.75)";
        g.lineWidth = 1 + (i % 4) * 0.8;
        g.beginPath();
        g.ellipse(s * 0.5, s * 1.15, i * 4.8 + 4, i * 7 + 6, 0, 0, Math.PI * 2);
        g.stroke();
      }
      for (let i = 0; i < 140; i++) {
        g.strokeStyle = `rgba(255,220,170,${Math.random() * 0.07})`;
        g.beginPath();
        g.moveTo(Math.random() * s, 0);
        g.lineTo(Math.random() * s, s);
        g.stroke();
      }
    },
    0.55,
  );
  const oak = phys("#ffffff", { map: grain, metalness: 0, roughness: 0.82, clearcoat: 0.05 });
  const darkOak = phys("#9a6a3a", { map: grain, metalness: 0, roughness: 0.75 });
  const iron = phys("#2b2c33", { metalness: 0.85, roughness: 0.5 });
  const bronze = phys("#b8782f", { metalness: 0.9, roughness: 0.32, clearcoat: 0.3 });

  group.add(ext(heater(1), 0.3, oak, 0.05));
  group.add(at(ext(framed(heater, 1, 0.86), 0.1, darkOak, 0.03), 0, 0, 0.17));

  const bracket: Pt[] = [[0, 0], [0.42, 0], [0.42, -0.1], [0.1, -0.1], [0.1, -0.42], [0, -0.42]];
  const bGeo = extGeo(poly(bracket), 0.34, 0.02);
  const rivet = new SphereGeometry(0.05, 10, 8);
  for (const s of [-1, 1]) {
    const b = at(new Mesh(bGeo, iron), s * 0.87, 1.02, 0);
    b.scale.x = s;
    group.add(b);
    group.add(at(new Mesh(rivet, bronze), s * 0.79, 0.94, 0.22));
  }
  group.add(at(ext(poly([[-0.9, 0.6], [0.9, 0.6], [0.9, 0.72], [-0.9, 0.72]]), 0.36, iron, 0.02)));
  group.add(at(ext(poly([[-0.2, 0.18], [0.2, 0.18], [0, -0.14]]), 0.36, iron, 0.02), 0, -1.12, 0));

  const acorn = new Group();
  const nut = new LatheGeometry([[0, -0.42], [0.08, -0.4], [0.16, -0.32], [0.21, -0.2], [0.22, -0.08], [0.2, 0]].map(([x, y]) => new Vector2(x, y)), 24);
  const cap = new LatheGeometry([[0.25, 0], [0.27, 0.04], [0.25, 0.12], [0.17, 0.2], [0.08, 0.24], [0, 0.25]].map(([x, y]) => new Vector2(x, y)), 24);
  acorn.add(new Mesh(nut, bronze), new Mesh(cap, phys("#8a5a22", { metalness: 0.9, roughness: 0.45 })), at(new Mesh(new CylinderGeometry(0.03, 0.04, 0.12, 8), bronze), 0, 0.31, 0));
  acorn.position.set(0, -0.1, 0.22);
  acorn.scale.setScalar(1.35);
  group.add(acorn);

  return { group, fx, tick: () => {}, rim: "#e0a050" };
}

/** 2 Bronze, Forge Vanguard: hammered octagon, rivets, crossed barbells, embers. */
export function buildBronze(): Built {
  const { group, fx } = newBuilt();
  const hammer = canvasTex(
    256,
    (g, s) => {
      g.fillStyle = "#808080";
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 520; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 5 + Math.random() * 12;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(40,40,40,.55)");
        grad.addColorStop(1, "rgba(200,200,200,0)");
        g.fillStyle = grad;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    },
    0.45,
    false,
  );
  const antique = phys("#8c5a2b", { metalness: 1, roughness: 0.48, bumpMap: hammer, bumpScale: 2.5 });
  const polished = phys("#d28a3c", { metalness: 1, roughness: 0.26, clearcoat: 0.4 });
  const plateMat = phys("#5a3a1e", { metalness: 0.9, roughness: 0.4 });
  const oct = (r: number) => ngon(8, r, Math.PI / 8);

  group.add(ext(oct(1.1), 0.34, antique, 0.06));
  group.add(at(ext(framed(oct, 0.96, 0.82), 0.1, polished, 0.03), 0, 0, 0.2));

  const rivet = new SphereGeometry(0.07, 12, 10);
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const r = at(new Mesh(rivet, polished), Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.24);
    r.scale.z = 0.6;
    group.add(r);
  }

  const barGeo = new CylinderGeometry(0.035, 0.035, 1.5, 12).rotateZ(Math.PI / 2);
  const bigPlate = new CylinderGeometry(0.27, 0.27, 0.07, 28).rotateZ(Math.PI / 2);
  const smallPlate = new CylinderGeometry(0.2, 0.2, 0.07, 28).rotateZ(Math.PI / 2);
  const collar = new CylinderGeometry(0.06, 0.06, 0.05, 14).rotateZ(Math.PI / 2);
  for (const rz of [0.62, -0.62]) {
    const bb = new Group();
    bb.add(new Mesh(barGeo, polished));
    for (const s of [-1, 1]) {
      bb.add(at(new Mesh(bigPlate, plateMat), s * 0.46, 0, 0), at(new Mesh(smallPlate, plateMat), s * 0.55, 0, 0), at(new Mesh(collar, polished), s * 0.64, 0, 0));
    }
    bb.position.z = 0.3;
    bb.rotation.z = rz;
    bb.scale.setScalar(0.92);
    group.add(bb);
  }

  const embers = particles({ count: 24, color: "#ff7a2a", size: 0.1, mode: "rise", spread: 1.15, speed: 0.22 });
  fx.add(embers.points);
  return { group, fx, tick: (t) => embers.tick(t), rim: "#ff6a1f" };
}

/** 3 Silver, Steel Sentinel: brushed kite shield, layered feather wings, chevron core. */
export function buildSilver(): Built {
  const { group, fx } = newBuilt();
  const brushed = phys("#dfe4ea", { metalness: 1, roughness: 0.3, anisotropy: 0.7, clearcoat: 0.2 });
  const mirror = phys("#f4f7fb", { metalness: 1, roughness: 0.06, clearcoat: 1 });
  const steel = phys("#8d99ae", { metalness: 1, roughness: 0.28 });

  group.add(ext(kite(1), 0.3, brushed, 0.05));
  group.add(at(ext(framed(kite, 1, 0.88), 0.1, mirror, 0.03), 0, 0, 0.18));
  [[0.55, 1], [0.24, 0.8], [-0.07, 0.6]].forEach(([y, s]) => {
    group.add(at(ext(poly([[-0.5, 0.12], [0, -0.2], [0.5, 0.12], [0.5, 0.32], [0, 0], [-0.5, 0.32]], s), 0.07, steel, 0.02), 0, y, 0.2));
  });
  group.add(at(ext(poly([[0, 0.2], [0.14, 0], [0, -0.2], [-0.14, 0]]), 0.08, mirror, 0.02), 0, -0.52, 0.2));

  const rowA = phys("#d5dbe3", { metalness: 1, roughness: 0.22 });
  const rowB = phys("#f1f5f9", { metalness: 1, roughness: 0.14 });
  for (const s of [-1, 1] as const) {
    fanWing(group, { s, x: 0.78, y: 0.55, z: -0.1, n: 7, a0: 62, a1: -16, len0: 0.7, len1: 1.06, wid: 0.2, mat: () => rowA });
    fanWing(group, { s, x: 0.8, y: 0.5, z: 0.0, n: 5, a0: 55, a1: -5, len0: 0.5, len1: 0.66, wid: 0.15, mat: () => rowB });
  }
  return { group, fx, tick: () => {}, rim: "#cfe3ff" };
}

/** 4 Gold, Solar Sovereign: royal crest, three-point crown, sunray relief, glowing core. */
export function buildGold(): Built {
  const { group, fx } = newBuilt();
  const gold = phys("#ffc83d", { metalness: 1, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const bright = phys("#ffe08a", { metalness: 1, roughness: 0.1, clearcoat: 1 });
  const coreMat = phys("#ffd36b", { metalness: 0.6, roughness: 0.15, emissive: "#ffa000", emissiveIntensity: 1.1 });

  group.add(ext(heater(1), 0.3, gold, 0.05));
  group.add(at(ext(framed(heater, 1, 0.9), 0.1, bright, 0.03), 0, 0, 0.18));

  const crown: Pt[] = [[-0.6, 0], [0.6, 0], [0.68, 0.55], [0.34, 0.28], [0, 0.85], [-0.34, 0.28], [-0.68, 0.55]];
  group.add(at(ext(poly(crown), 0.22, gold, 0.04), 0, 1.06, 0));
  group.add(at(ext(poly([[-0.62, 0], [0.62, 0], [0.62, 0.16], [-0.62, 0.16]]), 0.26, bright, 0.03), 0, 1.06, 0));
  const ball = new SphereGeometry(0.075, 14, 10);
  for (const [x, y] of [[-0.68, 0.6], [0, 0.9], [0.68, 0.6]]) group.add(at(new Mesh(ball, coreMat), x, 1.06 + y, 0.02));

  const rayGeos = [0.2, 0.3, 0.45].map((L) => extGeo(poly([[-0.045, 0], [0, L], [0.045, 0]]), 0.05, 0.01).translate(0, 0.36, 0));
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    const g = Math.cos(a) < -0.5 ? rayGeos[0] : k % 2 ? rayGeos[2] : rayGeos[1];
    const m = at(new Mesh(g, bright), 0, 0.12, 0.2);
    m.rotation.z = a;
    group.add(m);
  }
  const core = new Mesh(new SphereGeometry(0.24, 24, 16), coreMat);
  core.scale.z = 0.8;
  group.add(at(core, 0, 0.12, 0.26));
  group.add(at(new Mesh(new TorusGeometry(0.33, 0.03, 10, 40), bright), 0, 0.12, 0.22));

  const sparks = particles({ count: 22, color: "#ffd24a", size: 0.09, mode: "orbit", spread: 1.15, speed: 0.2 });
  fx.add(sparks.points);
  return {
    group,
    fx,
    tick: (t) => {
      coreMat.emissiveIntensity = 1 + Math.sin(t * 2.2) * 0.4;
      sparks.tick(t);
    },
    rim: "#ffcf55",
  };
}

/** 5 Platinum, Glacier Apex: faceted crystal-ice star shield with chrome trim. */
export function buildPlatinum(): Built {
  const { group, fx } = newBuilt();
  const ice = phys("#a9e6ff", { metalness: 0.3, roughness: 0.1, clearcoat: 1, transmission: 0.25, thickness: 1, ior: 1.31, flatShading: true, emissive: "#0b3d55", emissiveIntensity: 0.7, envMapIntensity: 1.6 });
  const iceHi = phys("#d6f4ff", { metalness: 0.2, roughness: 0.06, clearcoat: 1, flatShading: true, emissive: "#1d6f94", emissiveIntensity: 0.5, envMapIntensity: 1.8 });
  const chrome = phys("#e8eaee", { metalness: 1, roughness: 0.07, clearcoat: 1 });
  const starFn = (s: number) => star(6, 1.25 * s, 0.66 * s);

  group.add(ext(framed(starFn, 1.16, 1.0), 0.36, chrome, 0.03));
  group.add(ext(starFn(1), 0.3, ice, 0.08));
  group.add(at(ext(star(6, 0.8, 0.42), 0.12, iceHi, 0.06), 0, 0, 0.2));
  const crystal = new Mesh(new OctahedronGeometry(0.3), phys("#7fdcff", { metalness: 0.1, roughness: 0.04, clearcoat: 1, flatShading: true, emissive: "#28b4e8", emissiveIntensity: 0.9 }));
  crystal.scale.y = 1.5;
  group.add(at(crystal, 0, 0, 0.34));

  const cyan = new PointLight(0x66e0ff, 12, 9, 2);
  cyan.position.set(1.8, 1.6, 2.6);
  fx.add(cyan);
  const frost = particles({ count: 28, color: "#c8f1ff", size: 0.08, mode: "orbit", spread: 1.3, speed: 0.15 });
  fx.add(frost.points);
  return { group, fx, tick: (t) => frost.tick(t), rim: "#5fd0ff" };
}
