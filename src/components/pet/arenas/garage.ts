import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  type Texture,
} from "three";
import type { ArenaBuild } from "./types";
import { Stage, glow, inst, mk, rng, sprite, tex, type Inst } from "./kit";

const concreteTex = () =>
  tex(
    512,
    512,
    (g, w, h) => {
      const r = rng(7);
      g.fillStyle = "#55524d";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) {
        const v = 60 + r() * 60;
        g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.35)`;
        g.fillRect(r() * w, r() * h, 2, 2);
      }
      const stain = (x: number, y: number, rad: number, c: string) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, c);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      };
      for (let i = 0; i < 6; i++) stain(r() * w, r() * h, 40 + r() * 60, "rgba(25,18,10,0.55)");
      for (let i = 0; i < 3; i++) stain(r() * w, r() * h, 30 + r() * 40, "rgba(120,60,20,0.35)");
      g.strokeStyle = "#1d1b19";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, h / 2);
      g.lineTo(w, h / 2);
      g.moveTo(w / 2, 0);
      g.lineTo(w / 2, h);
      g.stroke();
      g.strokeStyle = "#141210";
      for (let c = 0; c < 8; c++) {
        let x = r() * w;
        let y = r() * h;
        let a = r() * Math.PI * 2;
        g.lineWidth = 1 + r() * 1.2;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 14; k++) {
          a += (r() - 0.5) * 1.2;
          const l = 14 + r() * 16;
          x += Math.cos(a) * l;
          y += Math.sin(a) * l;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    },
    { repeat: [2.8, 3.85] },
  );

const woodTex = () =>
  tex(256, 256, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#6a4a2a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const x0 = r() * w;
      g.strokeStyle = r() > 0.5 ? "rgba(30,15,5,0.35)" : "rgba(200,150,90,0.18)";
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      g.moveTo(x0, 0);
      for (let y = 0; y <= h; y += 32) g.lineTo(x0 + Math.sin(y * 0.05 + i) * 3, y);
      g.stroke();
    }
    for (let k = 0; k < 3; k++) {
      g.fillStyle = "rgba(35,20,8,0.55)";
      g.beginPath();
      g.ellipse(r() * w, r() * h, 6, 12, 0, 0, Math.PI * 2);
      g.fill();
    }
  });

const rustTex = () =>
  tex(128, 128, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = "#7a3f1c";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = ["#b4571e", "#3a1f10", "#8a4a22", "#5a2c12"][Math.floor(r() * 4)];
      g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4);
    }
  });

export function buildGarage(): ArenaBuild {
  const s = new Stage();
  const concrete = concreteTex();
  const wood = woodTex();
  const woodAcross: Texture = wood.clone();
  woodAcross.rotation = Math.PI / 2;
  woodAcross.center.set(0.5, 0.5);
  woodAcross.needsUpdate = true;

  // Floor and back wall
  const floorMat = new MeshStandardMaterial({ color: 0x9a948c, map: concrete, bumpMap: concrete, bumpScale: 2, roughness: 0.95, metalness: 0 });
  const floor = mk(new PlaneGeometry(14, 20), floorMat, 0, 0, 5.1); // reaches under the camera
  floor.rotation.x = -Math.PI / 2;
  const wall = mk(new PlaneGeometry(10, 5), new MeshStandardMaterial({ color: 0x1a120c, roughness: 1 }), 0, 2.5, -4.5);
  s.add(floor, wall);

  // Timber framing
  const woodMat = new MeshStandardMaterial({ map: wood, color: 0xb0a090, roughness: 0.85 });
  const plateMat = new MeshStandardMaterial({ map: woodAcross, color: 0xb0a090, roughness: 0.85 });
  const studs: Inst[] = [];
  for (let i = 0; i < 9; i++) studs.push({ p: [-4.8 + i * 1.2, 2.2, -4.4] });
  s.add(inst(new BoxGeometry(0.14, 4.2, 0.1), woodMat, studs));
  const plateGeo = new BoxGeometry(10, 0.14, 0.12);
  s.add(mk(plateGeo, plateMat, 0, 4.3, -4.4), mk(plateGeo, plateMat, 0, 0.07, -4.4), mk(plateGeo, plateMat, 0, 2.1, -4.4));

  // Rusted plate stacks
  const rust = rustTex();
  const plateMetal = new MeshStandardMaterial({ map: rust, color: 0xffffff, roughness: 0.9, metalness: 0.3 });
  const plates: Inst[] = [];
  const stack = (x: number, z: number, radii: number[], th: number) => {
    let y = th / 2;
    radii.forEach((rad, i) => {
      plates.push({ p: [x, y, z], s: [rad, th, rad], c: ["#ffffff", "#d8b090", "#b88860"][i % 3] });
      y += th;
    });
  };
  stack(3.3, -2.6, [0.55, 0.55, 0.5, 0.5, 0.45, 0.45], 0.11);
  stack(2.4, -3.5, [0.42, 0.42, 0.4, 0.4], 0.1);
  plates.push({ p: [3.9, 0.54, -4.2], r: [Math.PI / 2 - 0.12, 0, 0], s: [0.55, 0.1, 0.55] });
  plates.push({ p: [3.2, 0.5, -4.25], r: [Math.PI / 2 - 0.1, 0, 0.1], s: [0.5, 0.1, 0.5], c: "#c8a080" });
  s.add(inst(new CylinderGeometry(1, 1, 1, 28), plateMetal, plates));
  const ironMat = new MeshStandardMaterial({ color: 0x2a2623, roughness: 0.8, metalness: 0.6 });
  s.add(mk(new CylinderGeometry(0.05, 0.05, 1.0, 8), ironMat, 3.3, 0.5, -2.6), mk(new CylinderGeometry(0.05, 0.05, 0.6, 8), ironMat, 2.4, 0.3, -3.5));

  // Floor fan
  const fan = new Group();
  fan.position.set(-3.3, 0, -2.4);
  fan.rotation.y = 0.55;
  const fanMat = new MeshStandardMaterial({ color: 0x4a4f4a, roughness: 0.6, metalness: 0.7 });
  const head = new Group();
  head.position.y = 1.45;
  fan.add(mk(new CylinderGeometry(0.42, 0.46, 0.08, 20), fanMat, 0, 0.04, 0), mk(new CylinderGeometry(0.05, 0.05, 1.4, 8), fanMat, 0, 0.74, 0), head);
  const motor = mk(new CylinderGeometry(0.15, 0.15, 0.3, 14), fanMat);
  motor.rotation.x = Math.PI / 2;
  const cageGeo = new TorusGeometry(0.55, 0.018, 6, 28);
  const cageA = mk(cageGeo, fanMat, 0, 0, 0.17);
  const cageB = mk(new TorusGeometry(0.3, 0.014, 6, 24), fanMat, 0, 0, 0.17);
  const rotor = new Group();
  rotor.position.z = 0.04;
  const bladeGeo = new BoxGeometry(0.46, 0.17, 0.014);
  const bladeMat = new MeshStandardMaterial({ color: 0x6b2b1d, roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const g = new Group();
    g.rotation.z = (i * Math.PI) / 2;
    const b = mk(bladeGeo, bladeMat, 0.3, 0, 0);
    b.rotation.x = 0.35;
    g.add(b);
    rotor.add(g);
  }
  head.add(motor, cageA, cageB, rotor);
  s.add(fan);
  s.ticks.push((t) => {
    rotor.rotation.z = -t * 3;
    head.rotation.y = Math.sin(t * 0.4) * 0.3;
  });

  // Edison bulb, cord and warm light
  const bx = 1.5;
  const bz = -1.5;
  const by = 3.9;
  const brass = new MeshStandardMaterial({ color: 0x6b4a1c, roughness: 0.5, metalness: 0.8 });
  const glass = new MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa040, emissiveIntensity: 2.2, transparent: true, opacity: 0.85, roughness: 0.2 });
  const fil = new MeshBasicMaterial({ color: 0xffe3b0 });
  const bulb = mk(new SphereGeometry(0.14, 16, 12), glass, bx, by, bz);
  bulb.scale.y = 1.3;
  s.add(
    bulb,
    mk(new CylinderGeometry(0.02, 0.02, 0.2, 6), fil, bx, by, bz),
    mk(new CylinderGeometry(0.07, 0.07, 0.14, 10), brass, bx, by + 0.28, bz),
    mk(new CylinderGeometry(0.012, 0.012, 1.4, 5), new MeshBasicMaterial({ color: 0x0c0806 }), bx, by + 1.05, bz),
  );
  const halo = sprite(glow("rgba(255,170,80,0.9)"), "#ffb060", 0.7);
  halo.scale.setScalar(1.3);
  halo.position.set(bx, by, bz);
  const pool = mk(new PlaneGeometry(6, 6), new MeshBasicMaterial({ map: glow("rgba(255,170,80,0.55)"), transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, side: DoubleSide }), bx - 0.4, 0.02, bz + 0.6);
  pool.rotation.x = -Math.PI / 2;
  const light = new PointLight(0xffb060, 55, 14, 2);
  light.position.set(bx, by - 0.2, bz);
  s.add(halo, pool, light);
  s.ticks.push((t) => {
    const dip = Math.sin(t * 2.3) > 0.96 ? 0.75 : 1;
    const f = (0.92 + 0.05 * Math.sin(t * 11) + 0.03 * Math.sin(t * 23.7 + 1)) * dip;
    light.intensity = 55 * f;
    glass.emissiveIntensity = 2.2 * f;
    halo.material.opacity = 0.7 * f;
  });

  return s.build("garage", "#0b0705", { color: "#0b0705", near: 9, far: 22 });
}
