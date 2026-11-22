"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import type { ArenaId } from "@/lib/arenas";
import { usePetEvents } from "@/store/petEvents";
import { buildArena } from "./arenas";
import type { ArenaBuild } from "./arenas/types";
import { PET_PIVOT, buildPet, disposeObject, type PetModel } from "./buildPet";
import { createPetAnimator, type PetAnimator } from "./petAnimations";

interface Props {
  stage: number;
  accent: string;
  height?: number;
  className?: string;
  /** Plays the tired yawn loop while no reaction is running. */
  tired?: boolean;
  /** Training arena backdrop; null or omitted keeps the transparent look. */
  arena?: ArenaId | null;
  /** Small docked viewport: no drag-to-spin, lower pixel ratio, closer framing. */
  compact?: boolean;
}

interface Api {
  setModel: (stage: number, accent: string) => void;
  setTired: (tired: boolean) => void;
  setArena: (id: ArenaId | null) => void;
  setCompact: (compact: boolean) => void;
}

interface Burst {
  pts: Points;
  vel: Float32Array;
  age: number;
  life: number;
}

export default function WorkoutPet3D({ stage, accent, height = 320, className = "", tired = false, arena = null, compact = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<Api | null>(null);
  const [failed, setFailed] = useState(false);

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
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 100);
    const cfg = { compact: false, arena: false };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.compact ? 1.5 : 2));
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const widen = Math.max(1, 1.1 / camera.aspect) * (cfg.compact ? 0.88 : 1);
      if (cfg.arena) {
        camera.position.set(0, 2.8, 10.4 * widen);
        camera.lookAt(0, 1.95, 0);
      } else {
        camera.position.set(0, 2.2, 8.6 * widen);
        camera.lookAt(0, 1.7, 0);
      }
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    scene.add(new HemisphereLight(0xbfd8ff, 0x1a2233, 0.9));
    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 5, 4);
    const fill = new DirectionalLight(0x9db8ff, 0.8);
    fill.position.set(-4, 2, 3);
    const rim = new DirectionalLight(0xffffff, 2.2);
    rim.position.set(-2, 3, -4);
    scene.add(key, fill, rim);

    // Soft ground shadow disc
    const sc = document.createElement("canvas");
    sc.width = sc.height = 128;
    const sx = sc.getContext("2d");
    if (sx) {
      const g = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      sx.fillStyle = g;
      sx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new CanvasTexture(sc);
    const shadow = new Mesh(new PlaneGeometry(3.2, 3.2), new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    scene.add(shadow);

    // Golden star burst for record celebrations (one Points object per burst, disposed when faded).
    const sc2 = document.createElement("canvas");
    sc2.width = sc2.height = 64;
    const s2 = sc2.getContext("2d");
    if (s2) {
      const g = s2.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,244,190,0.9)");
      g.addColorStop(1, "rgba(255,215,0,0)");
      s2.fillStyle = g;
      s2.fillRect(0, 0, 64, 64);
      s2.fillStyle = "#ffffff";
      s2.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 28 : 11;
        s2.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
      }
      s2.closePath();
      s2.fill();
    }
    const starTex = new CanvasTexture(sc2);
    const bursts: Burst[] = [];
    const gold = [new Color("#FFD700"), new Color("#FDE68A")];
    const spawnBurst = () => {
      const n = reduced ? 28 : 72;
      const speed = reduced ? 0.6 : 1;
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const vel = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const up = Math.random() * 0.9 + 0.1;
        const sp = (2.5 + Math.random() * 2.5) * speed;
        pos.set([0, (model?.pet.position.y ?? PET_PIVOT) + 0.7, 0.4], i * 3);
        vel.set([Math.cos(a) * sp * (1 - up * 0.4), up * sp * 1.1, Math.sin(a) * sp * (1 - up * 0.4)], i * 3);
        const c = gold[i % 2];
        col.set([c.r, c.g, c.b], i * 3);
      }
      const geo = new BufferGeometry();
      geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
      geo.setAttribute("color", new Float32BufferAttribute(col, 3));
      const pm = new PointsMaterial({ size: 0.42, map: starTex, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false });
      const pts = new Points(geo, pm);
      pts.frustumCulled = false;
      scene.add(pts);
      bursts.push({ pts, vel, age: 0, life: reduced ? 1 : 1.4 });
    };
    const stepBursts = (dt: number) => {
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.age += dt;
        if (b.age >= b.life) {
          scene.remove(b.pts);
          b.pts.geometry.dispose();
          (b.pts.material as PointsMaterial).dispose();
          bursts.splice(i, 1);
          continue;
        }
        const attr = b.pts.geometry.getAttribute("position") as Float32BufferAttribute;
        for (let j = 0; j < attr.count; j++) {
          b.vel[j * 3 + 1] -= 7 * dt;
          attr.setXYZ(j, attr.getX(j) + b.vel[j * 3] * dt, attr.getY(j) + b.vel[j * 3 + 1] * dt, attr.getZ(j) + b.vel[j * 3 + 2] * dt);
        }
        attr.needsUpdate = true;
        (b.pts.material as PointsMaterial).opacity = Math.max(0, 1 - Math.pow(b.age / b.life, 1.5));
      }
    };

    let model: PetModel | null = null;
    let animator: PetAnimator | null = null;
    let isTired = false;
    let arenaBuild: ArenaBuild | null = null;
    apiRef.current = {
      setModel: (st, ac) => {
        if (model) {
          scene.remove(model.pet);
          disposeObject(model.pet);
        }
        model = buildPet(st, ac);
        scene.add(model.pet);
        rim.color = new Color(ac);
        animator = createPetAnimator(model.rig, { reducedMotion: reduced, onBurst: spawnBurst });
        animator.setTired(isTired);
      },
      setTired: (v) => {
        isTired = v;
        animator?.setTired(v);
      },
      setArena: (id) => {
        if (arenaBuild) {
          scene.remove(arenaBuild.group);
          arenaBuild.dispose();
          arenaBuild = null;
        }
        scene.background = null;
        scene.fog = null;
        if (id) {
          try {
            const a = buildArena(id);
            arenaBuild = a;
            scene.add(a.group); // scene root, so dragging spins only the pet
            scene.background = a.background ?? null;
            scene.fog = a.fog ? new Fog(a.fog.color, a.fog.near, a.fog.far) : null;
          } catch {
            arenaBuild = null; // fall back to the transparent look
          }
        }
        cfg.arena = arenaBuild !== null;
        canvas.dataset.arena = arenaBuild ? id ?? "" : "";
        resize();
      },
      setCompact: (v) => {
        cfg.compact = v;
        if (v) st.vy = st.vx = 0;
        resize();
      },
    };

    // New reactions only: the one already in the store at mount time is ignored.
    let lastReaction = usePetEvents.getState().reaction?.id ?? 0;
    const unsub = usePetEvents.subscribe((state) => {
      const r = state.reaction;
      if (!r || r.id === lastReaction) return;
      lastReaction = r.id;
      animator?.play(r.action);
    });

    // Interaction state (angles in radians, velocities in radians per second)
    const st = { rotY: 0.5, rotX: 0, vy: 0, vx: 0, drag: false, lastX: 0, lastY: 0, lastT: 0, interact: -1e9 };
    const clampX = (v: number) => Math.max(-0.6, Math.min(0.6, v));

    const down = (e: PointerEvent) => {
      if (cfg.compact) return;
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
      if (e.timeStamp - st.lastT > 80) st.vy = st.vx = 0; // paused before release
      st.interact = performance.now();
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let nextBlink = 2;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // rAF timestamps can predate `last`
      last = now;
      t += dt;

      if (!st.drag) {
        st.rotY += st.vy * dt;
        st.rotX = clampX(st.rotX + st.vx * dt);
        if (Math.abs(st.rotX) >= 0.6) st.vx = 0;
        const damp = Math.pow(0.92, dt * 60);
        st.vy *= damp;
        st.vx *= damp;
        const idle = now - st.interact - 2000;
        if (idle > 0 && !cfg.compact) {
          if (!reduced) st.rotY += 0.35 * Math.min(1, idle / 1000) * dt;
          st.rotX -= st.rotX * (1 - Math.pow(0.97, dt * 60));
        }
      }

      const bob = Math.sin(t * 1.6) * (reduced ? 0.02 : 0.08);
      animator?.update(dt);
      arenaBuild?.tick(t, dt);
      stepBursts(dt);
      if (model) {
        const pet = model.pet;
        pet.rotation.set(st.rotX, st.rotY, 0);
        pet.position.y = PET_PIVOT + bob;
        pet.scale.setScalar(1 + Math.sin(t * 2.2) * 0.012);
        if (t > nextBlink) {
          const k = (t - nextBlink) / 0.16;
          model.blink(k < 1 ? Math.sin(k * Math.PI) : 0);
          if (k >= 1) nextBlink = t + 2.5 + Math.random() * 2.5;
        }
        model.tick(t, dt);
      }
      shadow.scale.setScalar(1 - bob * 0.8);

      canvas.dataset.rotY = (Math.round(st.rotY * 1000) / 1000).toString();
      canvas.dataset.rotX = (Math.round(st.rotX * 1000) / 1000).toString();
      canvas.dataset.action = animator?.current() ?? "IDLE";
      canvas.dataset.handDumbbells = model?.rig.dumbbells.left.visible ? "1" : "0";
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      unsub();
      apiRef.current = null;
      if (arenaBuild) {
        scene.remove(arenaBuild.group);
        arenaBuild.dispose();
      }
      bursts.forEach((b) => {
        b.pts.geometry.dispose();
        (b.pts.material as PointsMaterial).dispose();
      });
      starTex.dispose();
      if (model) disposeObject(model.pet);
      shadow.geometry.dispose();
      (shadow.material as MeshBasicMaterial).dispose();
      shadowTex.dispose();
      renderer.dispose(); // no forceContextLoss: a lost context cannot be reused after a remount
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setModel(stage, accent);
  }, [stage, accent]);

  useEffect(() => {
    apiRef.current?.setTired(tired);
  }, [tired]);

  useEffect(() => {
    apiRef.current?.setArena(arena);
  }, [arena]);

  useEffect(() => {
    apiRef.current?.setCompact(compact);
  }, [compact]);

  return (
    <div ref={wrapRef} className={`relative w-full overflow-hidden ${className}`} style={{ height }}>
      {failed ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-line bg-card-2 p-4 text-center text-sm text-muted">
          Your device cannot show the Three-Dimensional companion right now. Your progress is safe.
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          data-testid="pet-canvas"
          aria-label={compact ? "Three-Dimensional companion" : "Three-Dimensional companion, drag to spin"}
          className={`block h-full w-full ${compact ? "" : "cursor-grab"}`}
          style={{ touchAction: compact ? "auto" : "none" }}
        />
      )}
    </div>
  );
}
