"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { PET_PIVOT, buildPet, disposeObject, type PetModel } from "./buildPet";

interface Props {
  stage: number;
  accent: string;
  height?: number;
  className?: string;
}

interface Api {
  setModel: (stage: number, accent: string) => void;
}

export default function WorkoutPet3D({ stage, accent, height = 320, className = "" }: Props) {
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 100);
    const resize = () => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.set(0, 2.2, 8.6 * Math.max(1, 1.1 / camera.aspect));
      camera.lookAt(0, 1.7, 0);
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

    let model: PetModel | null = null;
    apiRef.current = {
      setModel: (st, ac) => {
        if (model) {
          scene.remove(model.pet);
          disposeObject(model.pet);
        }
        model = buildPet(st, ac);
        scene.add(model.pet);
        rim.color = new Color(ac);
      },
    };

    // Interaction state (angles in radians, velocities in radians per second)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = { rotY: 0.5, rotX: 0, vy: 0, vx: 0, drag: false, lastX: 0, lastY: 0, lastT: 0, interact: -1e9 };
    const clampX = (v: number) => Math.max(-0.6, Math.min(0.6, v));

    const down = (e: PointerEvent) => {
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
      const dt = Math.min(0.05, (now - last) / 1000);
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
        if (idle > 0) {
          if (!reduced) st.rotY += 0.35 * Math.min(1, idle / 1000) * dt;
          st.rotX -= st.rotX * (1 - Math.pow(0.97, dt * 60));
        }
      }

      const bob = Math.sin(t * 1.6) * (reduced ? 0.02 : 0.08);
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
      apiRef.current = null;
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
          aria-label="Three-Dimensional companion, drag to spin"
          className="block h-full w-full cursor-grab"
          style={{ touchAction: "none" }}
        />
      )}
    </div>
  );
}
