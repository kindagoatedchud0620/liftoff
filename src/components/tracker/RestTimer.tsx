"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Square, Timer } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useNow } from "@/store/derived";

const PRESETS = [60, 90, 120, 180];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

let ctx: AudioContext | null = null;
function audio() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
  return ctx;
}

function chime() {
  const c = audio();
  if (!c) return;
  [660, 880, 1100].forEach((f, i) => {
    const t = c.currentTime + i * 0.18;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.55);
  });
}

export default function RestTimer() {
  const rest = useStore((s) => s.rest);
  const startRest = useStore((s) => s.startRest);
  const adjustRest = useStore((s) => s.adjustRest);
  const stopRest = useStore((s) => s.stopRest);
  const now = useNow(250);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const fired = useRef<number | null>(null);

  // Unlock audio on the first user gesture anywhere (browsers block autoplay otherwise).
  useEffect(() => {
    const unlock = () => audio();
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);

  const { endsAt, duration } = rest;
  const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const running = endsAt !== null;

  useEffect(() => {
    if (endsAt && now >= endsAt && fired.current !== endsAt) {
      fired.current = endsAt; // once per countdown
      chime();
      stopRest();
      setFlash(true);
    }
  }, [now, endsAt, stopRest]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const pct = running ? Math.min(1, left / Math.max(1, duration + 0)) : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  const btn = "flex h-9 min-w-9 items-center justify-center rounded-lg border border-line bg-card-2 px-2 text-xs font-semibold tabular-nums hover:border-accent";

  return (
    <div data-testid="rest-timer" className="fixed bottom-24 right-3 z-40 md:bottom-6 md:right-6">
      {flash && !running && (
        <div className="pop-in mb-2 rounded-lg border border-accent bg-card px-3 py-2 text-center text-sm font-semibold text-accent">Rest over</div>
      )}
      {running ? (
        <div className="w-60 rounded-xl border border-line bg-card p-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" className="text-line" strokeWidth="5" />
                <circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" className="text-accent" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">{fmt(left)}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex gap-1">
                <button aria-label="Subtract 15 seconds" className={btn} onClick={() => adjustRest(-15)}><Minus size={12} />15s</button>
                <button aria-label="Add 15 seconds" className={btn} onClick={() => adjustRest(15)}><Plus size={12} />15s</button>
              </div>
              <button aria-label="Stop rest timer" className={btn} onClick={stopRest}><Square size={12} className="mr-1" />Stop</button>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            {PRESETS.map((p) => (
              <button key={p} className={`${btn} flex-1`} onClick={() => startRest(p)}>{p}</button>
            ))}
          </div>
        </div>
      ) : open ? (
        <div className="w-60 rounded-xl border border-line bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Start rest (seconds)</span>
            <button aria-label="Close rest timer" className="px-1 text-base leading-none" onClick={() => setOpen(false)}>x</button>
          </div>
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button key={p} className={`${btn} flex-1`} onClick={() => { startRest(p); setOpen(false); }}>{p}</button>
            ))}
          </div>
        </div>
      ) : (
        <button aria-label="Open rest timer" onClick={() => { audio(); setOpen(true); }} className="flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-semibold shadow-xl hover:border-accent">
          <Timer size={16} className="text-accent" />
          <span className="tabular-nums">{fmt(duration)}</span>
        </button>
      )}
    </div>
  );
}
