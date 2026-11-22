import { AdditiveBlending, BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, OctahedronGeometry, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry } from "three";
import { at, ext, extGeo, fanWing, feather, framed, glowTex, newBuilt, particles, phys, poly, type Built, type Pt } from "./kit";
import { heater } from "./lowTiers";

const deg = (d: number) => (d * Math.PI) / 180;

/** 6 Diamond, Prism Paragon: floating faceted diamond inside two counter-rotating gyroscope rings. */
export function buildDiamond(): Built {
  const { group, fx } = newBuilt();
  const gemMat = phys("#c7d2fe", { metalness: 0, roughness: 0.02, ior: 2.4, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessMinimum: 200, iridescenceThicknessMaximum: 800, clearcoat: 1, flatShading: true, emissive: "#3b3fb8", emissiveIntensity: 0.3, envMapIntensity: 2.5 });
  const coreMat = phys("#a5b4fc", { metalness: 0, roughness: 0.1, flatShading: true, emissive: "#8b93ff", emissiveIntensity: 2 });
  const ringMat = phys("#9aa0e8", { metalness: 1, roughness: 0.18, clearcoat: 0.6 });
  const ringMat2 = phys("#d4d7f5", { metalness: 1, roughness: 0.12, clearcoat: 0.6 });

  const core = new Group();
  const spin = new Group();
  const gem = new Mesh(new OctahedronGeometry(0.85), gemMat);
  gem.scale.y = 1.3;
  const inner = new Mesh(new OctahedronGeometry(0.4), coreMat);
  inner.scale.y = 1.3;
  spin.add(gem, inner);
  core.add(spin);
  group.add(core);

  const torus = new TorusGeometry(1.3, 0.05, 14, 80);
  const node = new SphereGeometry(0.09, 12, 10);
  const mkRing = (mat: typeof ringMat, scale: number) => {
    const part = new Group();
    const mesh = new Mesh(torus, mat);
    mesh.scale.setScalar(scale);
    mesh.add(at(new Mesh(node, mat), 1.3, 0, 0), at(new Mesh(node, mat), -1.3, 0, 0));
    part.add(mesh);
    group.add(part);
    return mesh;
  };
  const ringA = mkRing(ringMat, 1);
  const ringB = mkRing(ringMat2, 0.86);

  const prism = particles({ count: 30, color: "#c7ccff", size: 0.08, mode: "orbit", spread: 1.5, speed: 0.25 });
  fx.add(prism.points);
  return {
    group,
    fx,
    tick: (t) => {
      spin.rotation.y = t * 0.6;
      ringA.rotation.x = t * 0.8;
      ringB.rotation.y = -t * 0.6;
      ringB.rotation.z = deg(90);
      prism.tick(t);
    },
    rim: "#8b93ff",
  };
}

/** 7 Champion, Crimson Warlord: obsidian and ruby spiked crest in golden laurel wreaths. */
export function buildChampion(): Built {
  const { group, fx } = newBuilt();
  const obsidian = phys("#0c0c12", { metalness: 0.6, roughness: 0.12, clearcoat: 1 });
  const ruby = phys("#b3122e", { metalness: 0, roughness: 0.1, clearcoat: 1, emissive: "#5a0010", emissiveIntensity: 0.8 });
  const gold = phys("#ffc83d", { metalness: 1, roughness: 0.18, clearcoat: 0.5 });

  const crest: Pt[] = [[0, 1.3], [0.3, 0.95], [0.75, 1.15], [0.7, 0.55], [0.95, 0.2], [0.62, -0.1], [0.55, -0.7], [0, -1.25], [-0.55, -0.7], [-0.62, -0.1], [-0.95, 0.2], [-0.7, 0.55], [-0.75, 1.15], [-0.3, 0.95]];
  group.add(ext(poly(crest), 0.32, obsidian, 0.05));
  group.add(at(ext(poly(crest, 0.62), 0.1, ruby, 0.04), 0, -0.02, 0.2));
  const gem = new Mesh(new OctahedronGeometry(0.2), ruby);
  gem.scale.y = 1.4;
  group.add(at(gem, 0, 0.1, 0.36));
  const horn = new ConeGeometry(0.08, 0.42, 10);
  for (const s of [-1, 1]) group.add(at(new Mesh(horn, ruby), s * 1.0, 0.2, 0, -s * Math.PI / 2));

  const leaf = extGeo(feather(0.34, 0.1), 0.03, 0.01);
  const stem = new TorusGeometry(1.12, 0.02, 6, 48, deg(178));
  for (const s of [-1, 1] as const) {
    const st = new Mesh(stem, gold);
    st.position.set(0, -0.05, -0.02);
    st.rotation.z = deg(-78) * s;
    st.scale.set(s, 1.1, 1);
    group.add(st);
    for (let i = 0; i < 9; i++) {
      const phi = deg(-78 + (178 * i) / 8);
      const x = Math.cos(phi) * 1.12;
      const y = Math.sin(phi) * 1.12 * 1.1 - 0.05;
      for (const off of [-26, 26]) {
        const m = new Mesh(leaf, gold);
        m.position.set(s * x, y, 0.02 + (off > 0 ? 0.01 : 0));
        m.rotation.z = (phi + Math.PI / 2 + deg(off)) * s;
        m.scale.x = s;
        group.add(m);
      }
    }
  }

  const sparks = particles({ count: 26, color: "#ff3b5c", size: 0.09, mode: "rise", spread: 1.3, speed: 0.25 });
  fx.add(sparks.points);
  return { group, fx, tick: (t) => sparks.tick(t), rim: "#ff3355" };
}

/** 8 Titan, Storm Colossus: gunmetal plates split by magma fissures, flanked by lightning-bolt wings. */
export function buildTitan(): Built {
  const { group, fx } = newBuilt();
  const gun = phys("#3a3f47", { metalness: 0.9, roughness: 0.38, clearcoat: 0.2 });
  const magma = phys("#ff5a00", { metalness: 0, roughness: 0.5, emissive: "#ff4500", emissiveIntensity: 2.2 });
  const bolt = phys("#ffe066", { metalness: 0.3, roughness: 0.25, emissive: "#ffd23f", emissiveIntensity: 1.6 });

  const J: Pt[] = [[0.04, 0.95], [-0.1, 0.55], [0.1, 0.2], [-0.08, -0.2], [0.1, -0.6], [0, -1.2]];
  const left: Pt[] = [[-0.9, 0.95], ...J.map(([x, y]) => [x - 0.035, y] as Pt), [-0.8, -0.7], [-1.05, 0.3]];
  const right: Pt[] = [[0.9, 0.95], [1.05, 0.3], [0.8, -0.7], ...[...J].reverse().map(([x, y]) => [x + 0.035, y] as Pt)];
  group.add(at(ext(poly([[-0.92, 0.97], [0.92, 0.97], [1.07, 0.3], [0.82, -0.72], [0, -1.22], [-0.82, -0.72], [-1.07, 0.3]]), 0.1, magma, 0.02), 0, 0, -0.14));
  group.add(ext(poly(left), 0.3, gun, 0.05));
  group.add(ext(poly(right), 0.3, gun, 0.05));

  const seg = new BoxGeometry(1, 0.045, 0.05);
  const crack = (pts: Pt[], x0: number, y0: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const m = at(new Mesh(seg, magma), x0 + (ax + bx) / 2, y0 + (ay + by) / 2, 0.2, Math.atan2(by - ay, bx - ax));
      m.scale.x = Math.hypot(bx - ax, by - ay);
      group.add(m);
    }
  };
  crack([[-0.9, 0.5], [-0.62, 0.34], [-0.55, 0.05], [-0.3, -0.12]], 0, 0);
  crack([[0.9, 0.2], [0.6, 0.04], [0.5, -0.3], [0.3, -0.5]], 0, 0);
  crack([[-0.6, -0.5], [-0.4, -0.62], [-0.3, -0.9]], 0, 0);
  const rivet = new SphereGeometry(0.06, 10, 8);
  for (const [x, y] of [[-0.78, 0.82], [0.78, 0.82], [-0.7, -0.4], [0.7, -0.4]]) group.add(at(new Mesh(rivet, gun), x, y, 0.22));

  const boltGeo = extGeo(poly([[0, 0.6], [0.42, 0.6], [0.2, 0.2], [0.55, 0.2], [-0.1, -0.7], [0.05, -0.12], [-0.3, -0.12]]), 0.08, 0.02);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const sc = 1 - k * 0.15;
      const m = at(new Mesh(boltGeo, bolt), s * (1.12 + k * 0.28), 0.4 - k * 0.38, -0.04);
      m.rotation.z = deg(-(18 + k * 18)) * s;
      m.scale.set(s * sc, sc, 1);
      group.add(m);
    }
  }

  const sparks = particles({ count: 24, color: "#ff8a2a", size: 0.09, mode: "rise", spread: 1.3, speed: 0.3 });
  fx.add(sparks.points);
  return {
    group,
    fx,
    tick: (t) => {
      magma.emissiveIntensity = 2 + Math.sin(t * 3) * 0.7;
      bolt.emissiveIntensity = 1.4 + Math.sin(t * 7) * 0.4;
      sparks.tick(t);
    },
    rim: "#ff7a1a",
  };
}

/** 9 Olympian, Celestial Mythic: tiered divine sanctuary crest, phoenix wings, spinning halo, aura. */
export function buildOlympian(): Built {
  const { group, fx } = newBuilt();
  const gold = phys("#ffc83d", { metalness: 1, roughness: 0.14, clearcoat: 0.7 });
  const bright = phys("#ffe39a", { metalness: 1, roughness: 0.08, clearcoat: 1 });
  const amber = phys("#f5a623", { metalness: 1, roughness: 0.2 });
  const ember = phys("#ff7a2a", { metalness: 0.8, roughness: 0.25, emissive: "#ff5a00", emissiveIntensity: 0.5 });
  const coreMat = phys("#fff1b8", { metalness: 0.4, roughness: 0.1, emissive: "#ffd24a", emissiveIntensity: 1.6 });

  group.add(ext(heater(1), 0.3, gold, 0.05));
  group.add(at(ext(heater(0.8), 0.12, bright, 0.03), 0, 0, 0.2));
  group.add(at(ext(framed(heater, 0.56, 0.5), 0.12, gold, 0.03), 0, 0, 0.32));
  group.add(at(new Mesh(new SphereGeometry(0.2, 24, 16), coreMat), 0, 0, 0.46));
  group.add(at(new Mesh(new TorusGeometry(0.3, 0.03, 10, 40), bright), 0, 0, 0.4));

  group.add(at(ext(poly([[-1.02, 0], [1.02, 0], [1.02, 0.12], [-1.02, 0.12]]), 0.26, bright, 0.03), 0, 1.0, 0));
  group.add(at(ext(poly([[-1.0, 0], [1.0, 0], [0, 0.45]]), 0.2, gold, 0.03), 0, 1.12, 0));
  const col = new CylinderGeometry(0.08, 0.09, 1.5, 14);
  const cap = new BoxGeometry(0.26, 0.08, 0.26);
  for (const s of [-1, 1]) {
    group.add(at(new Mesh(col, gold), s * 0.97, 0.2, 0.02));
    group.add(at(new Mesh(cap, bright), s * 0.97, 0.98, 0.02), at(new Mesh(cap, bright), s * 0.97, -0.58, 0.02));
  }

  const mats = [gold, gold, gold, amber, amber, amber, ember, ember, ember];
  for (const s of [-1, 1] as const) {
    fanWing(group, { s, x: 0.85, y: 0.35, z: -0.12, n: 9, a0: 80, a1: -15, len0: 0.8, len1: 1.25, wid: 0.24, mat: (i) => mats[i] });
    fanWing(group, { s, x: 0.88, y: 0.3, z: -0.04, n: 6, a0: 70, a1: 0, len0: 0.55, len1: 0.8, wid: 0.17, mat: () => bright });
  }

  const halo = new Group();
  halo.position.set(0, 1.78, 0);
  halo.rotation.x = 1.1;
  const spin = new Group();
  const bead = new OctahedronGeometry(0.08);
  spin.add(new Mesh(new TorusGeometry(0.46, 0.045, 12, 60), bright));
  for (let i = 0; i < 8; i++) spin.add(at(new Mesh(bead, coreMat), Math.cos((i * Math.PI) / 4) * 0.46, Math.sin((i * Math.PI) / 4) * 0.46, 0));
  halo.add(spin);
  group.add(halo);

  const tex = glowTex("rgba(255,214,100,0.9)");
  const aura = [5.2, 4, 3].map((sc, i) => {
    const sp = new Sprite(new SpriteMaterial({ map: tex, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.35 - i * 0.05 }));
    sp.scale.setScalar(sc);
    sp.position.z = -0.9;
    fx.add(sp);
    return sp;
  });
  const dust = particles({ count: 34, color: "#ffe08a", size: 0.09, mode: "orbit", spread: 1.6, speed: 0.18 });
  const dust2 = particles({ count: 24, color: "#c9b8ff", size: 0.07, mode: "orbit", spread: 1.8, speed: 0.12 });
  fx.add(dust.points, dust2.points);
  return {
    group,
    fx,
    tick: (t) => {
      spin.rotation.z = t * 0.9;
      aura.forEach((a, i) => ((a.material as SpriteMaterial).opacity = 0.3 - i * 0.05 + Math.sin(t * 1.6 + i) * 0.06));
      dust.tick(t);
      dust2.tick(t);
    },
    rim: "#ffe38a",
  };
}
