"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Euler,
  Group,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Tier, TierName } from "@/lib/types";
import { RankBadge } from "./RankBadge";
import { disposeDeep, type Built } from "./three/kit";
import { buildBronze, buildGold, buildPlatinum, buildSilver, buildWood } from "./three/lowTiers";
import { buildChampion, buildDiamond, buildOlympian, buildTitan } from "./three/highTiers";

export const TIER_TITLES: Record<TierName, string> = {
  Wood: "Timber Warden",
  Bronze: "Forge Vanguard",
  Silver: "Steel Sentinel",
  Gold: "Solar Sovereign",
  Platinum: "Glacier Apex",
  Diamond: "Prism Paragon",
  Champion: "Crimson Warlord",
  Titan: "Storm Colossus",
  Olympian: "Celestial Mythic",
};

const BUILDERS: (() => Built)[] = [buildWood, buildBronze, buildSilver, buildGold, buildPlatinum, buildDiamond, buildChampion, buildTitan, buildOlympian];

const ASM_DELAY = 0.4; // spread of start times across parts
const ASM_DUR = 1.0; // each part's flight time; total about 1.4s
const easeOutBack = (u: number) => 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
const easeOutCubic = (u: number) => 1 - Math.pow(1 - u, 3);

interface Part {
  o: Object3D;
  p: Vector3;
  q: Quaternion;
  s: Vector3;
  sp: Vector3;
  sq: Quaternion;
  delay: number;
}

interface Api {
  setTier: (tier: Tier, assemble: boolean) => void;
}

interface Props {
  tier: Tier;
  size?: number;
  interactive?: boolean;
  assemble?: boolean;
  className?: string;
  label?: string;
}

export function RankBadge3D({ tier, size = 200, interactive = true, assemble = false, className = "", label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<Api | null>(null);
  const propsRef = useRef({ interactive, assemble });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    propsRef.current = { interactive, assemble };
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.9;

    const camera = new PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 6.6);

    const key = new DirectionalLight(0xffe2b8, 2.6);
    key.position.set(3, 4, 5);
    const fill = new DirectionalLight(0x9fc4ff, 0.9);
    fill.position.set(-4, 1, 4);
    const rim = new DirectionalLight(0xffffff, 4.5);
    rim.position.set(-2.5, 2.5, -4);
    const rim2 = new DirectionalLight(0xffffff, 2.5);
    rim2.position.set(3, -2, -3);
    scene.add(key, fill, rim, rim2);

    const pivot = new Group();
    pivot.rotation.order = "YXZ";
    const holder = new Group();
    pivot.add(holder);
    scene.add(pivot);

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      renderer.setSize(Math.max(1, wrap.clientWidth), Math.max(1, wrap.clientWidth), false);
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let model: Built | null = null;
    let parts: Part[] = [];
    let asm = -1; // seconds into the assembly, -1 when inactive
    let flash = 0;
    let rimBase = 4.5;

    const applyAsm = () => {
      for (const pt of parts) {
        const u = Math.min(1, Math.max(0, (asm - pt.delay) / ASM_DUR));
        const e = easeOutBack(u);
        pt.o.position.lerpVectors(pt.sp, pt.p, e);
        pt.o.scale.copy(pt.s).multiplyScalar(Math.max(0, e));
        pt.o.quaternion.slerpQuaternions(pt.sq, pt.q, easeOutCubic(u));
      }
    };

    apiRef.current = {
      setTier: (t, doAssemble) => {
        if (model) {
          holder.remove(model.group, model.fx);
          disposeDeep(model.group);
          disposeDeep(model.fx);
        }
        model = BUILDERS[t.index]();
        holder.scale.setScalar(1);
        holder.position.set(0, 0, 0);
        holder.add(model.group, model.fx);
        holder.updateMatrixWorld(true);
        const box = new Box3().setFromObject(model.group);
        const size3 = box.getSize(new Vector3());
        const ctr = box.getCenter(new Vector3());
        const fit = Math.min(1.15, 3.2 / Math.max(size3.x, size3.y));
        holder.scale.setScalar(fit);
        holder.position.copy(ctr).multiplyScalar(-fit);

        rim.color.set(model.rim ?? t.color);
        rim2.color.set(model.rim ?? t.color);
        rimBase = 4.5;
        flash = 0;
        parts = [];
        asm = -1;
        if (doAssemble && !mq.matches) {
          parts = model.group.children.map((o) => {
            const dir = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() * 0.8).normalize();
            return {
              o,
              p: o.position.clone(),
              q: o.quaternion.clone(),
              s: o.scale.clone(),
              sp: o.position.clone().addScaledVector(dir, 2 + Math.random() * 2.5),
              sq: new Quaternion().setFromEuler(new Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)),
              delay: Math.random() * ASM_DELAY,
            };
          });
          asm = 0;
          applyAsm();
        }
        render();
      },
    };

    // Pointer state: angles in radians, velocities in radians per second.
    const st = { rotY: 0, rotX: 0, vy: 0, vx: 0, drag: false, lastX: 0, lastY: 0, lastT: 0, interact: -1e9 };
    const MAX_PITCH = 0.5;
    const clampX = (v: number) => Math.max(-MAX_PITCH, Math.min(MAX_PITCH, v));
    const down = (e: PointerEvent) => {
      if (!propsRef.current.interactive) return;
      st.drag = true;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.lastT = e.timeStamp;
      st.vy = st.vx = 0;
      st.interact = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!st.drag) return;
      const dx = (e.clientX - st.lastX) * 0.012;
      const dy = (e.clientY - st.lastY) * 0.008;
      const dt = Math.max(0.008, (e.timeStamp - st.lastT) / 1000);
      st.rotY += dx;
      st.rotX = clampX(st.rotX + dy);
      st.vy = st.vy * 0.5 + (dx / dt) * 0.5;
      st.vx = st.vx * 0.5 + (dy / dt) * 0.5;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.lastT = e.timeStamp;
      st.interact = performance.now();
    };
    const up = (e: PointerEvent) => {
      if (!st.drag) return;
      st.drag = false;
      if (e.timeStamp - st.lastT > 80) st.vy = st.vx = 0;
      st.interact = performance.now();
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    const lost = (e: Event) => e.preventDefault(); // allows the browser to restore the context
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("webglcontextlost", lost);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // The rAF timestamp can predate the performance.now() taken when the loop (re)started; a negative dt
      // would push asm below 0, which reads as "not assembling" and freezes every part at scale 0.
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      t += dt;
      const reduced = mq.matches;

      if (!st.drag) {
        st.rotY += st.vy * dt;
        st.rotX = clampX(st.rotX + st.vx * dt);
        if (Math.abs(st.rotX) >= MAX_PITCH) st.vx = 0;
        const damp = Math.pow(0.92, dt * 60);
        st.vy *= damp;
        st.vx *= damp;
        const idle = now - st.interact - 1500;
        if (idle > 0 && Math.abs(st.vy) < 0.3) {
          const k = (1 - Math.pow(0.96, dt * 60)) * Math.min(1, idle / 800);
          st.rotY += (Math.round(st.rotY / (Math.PI * 2)) * Math.PI * 2 - st.rotY) * k;
          st.rotX -= st.rotX * k;
        }
      }

      const sway = reduced ? 0.2 : 1;
      pivot.rotation.set(st.rotX + Math.sin(t * 0.9 + 1) * 0.04 * sway, st.rotY + Math.sin(t * 0.7) * 0.16 * sway, 0);
      pivot.position.y = Math.sin(t * 1.5) * (reduced ? 0.015 : 0.07);

      if (asm >= 0) {
        asm += dt;
        if (asm >= ASM_DELAY + ASM_DUR) {
          asm = -1;
          for (const pt of parts) {
            pt.o.position.copy(pt.p);
            pt.o.quaternion.copy(pt.q);
            pt.o.scale.copy(pt.s);
          }
          parts = [];
          flash = 1;
        } else applyAsm();
      }
      if (flash > 0) flash = Math.max(0, flash - dt / 0.6);
      rim.intensity = rimBase * (1 + flash * 5);
      renderer.toneMappingExposure = 1 + flash * 0.4;

      model?.tick(t, dt);
      canvas.dataset.rotY = (Math.round(pivot.rotation.y * 1000) / 1000).toFixed(3); // rendered angle, drag plus idle sway
      render();
    };

    // Render only while on screen and the tab is visible, so pet canvases keep their budget.
    let onScreen = true;
    const update = () => {
      if (onScreen && !document.hidden) {
        if (!raf) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((es) => {
      onScreen = es[es.length - 1].isIntersecting;
      update();
    });
    io?.observe(canvas);
    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      io?.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", update);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("webglcontextlost", lost);
      apiRef.current = null;
      if (model) {
        disposeDeep(model.group);
        disposeDeep(model.fx);
      }
      envScene.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose(); // no forceContextLoss: a lost context cannot be reused after a Strict Mode remount
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setTier(tier, propsRef.current.assemble);
  }, [tier]);

  const text = label ?? `${tier.name} rank badge, Three-Dimensional`;
  if (failed) return <RankBadge tier={tier} size={size} className={className} title={text} />;

  return (
    <div ref={wrapRef} className={`relative ${className}`} style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}>
      <canvas
        ref={canvasRef}
        role="img"
        data-testid="rank-badge-3d"
        data-tier={tier.name}
        aria-label={text}
        className="absolute inset-0 block h-full w-full"
        style={{ touchAction: interactive ? "none" : undefined, cursor: interactive ? "grab" : undefined }}
      />
    </div>
  );
}

export default RankBadge3D;
