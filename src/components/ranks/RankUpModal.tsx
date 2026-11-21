"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import type { RankUpEvent } from "@/lib/types";
import { RankBadge } from "./RankBadge";

// C major, F major, G major, then a held C major an octave up.
const CHORDS = [
  [261.63, 329.63, 392.0, 523.25],
  [349.23, 440.0, 523.25, 698.46],
  [392.0, 493.88, 587.33, 783.99],
  [523.25, 659.25, 783.99, 1046.5],
];

function fanfare(): () => void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    void ctx.resume().catch(() => {});
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    lp.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.05;
    CHORDS.forEach((freqs, ci) => {
      const start = t0 + ci * 0.36;
      const end = ci === CHORDS.length - 1 ? t0 + 1.8 : start + 0.4;
      freqs.forEach((hz, oi) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = oi === 0 ? "sawtooth" : "triangle";
        osc.frequency.value = hz;
        const peak = (0.12 / freqs.length) * (ci + 1 > 3 ? 1.2 : 1);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain).connect(lp);
        osc.start(start);
        osc.stop(end + 0.05);
      });
    });
    const timer = window.setTimeout(() => void ctx.close().catch(() => {}), 2300);
    return () => {
      window.clearTimeout(timer);
      void ctx.close().catch(() => {});
    };
  } catch {
    return () => {};
  }
}

const CSS = `
.ru-b{width:var(--s)!important;height:var(--s)!important}
.ru-stage{--s:140px;position:relative;width:var(--s);height:var(--s);margin:0 auto}
@media (min-width:640px){.ru-stage{--s:180px}}
.ru-abs{position:absolute;inset:0}
.ru-shake{animation:ru-shake .3s linear both}
.ru-frag{animation:ru-frag .35s ease-in .3s both}
.ru-new{animation:ru-slam .5s cubic-bezier(.2,.9,.3,1) .6s both}
.ru-ring{border-radius:9999px;border:3px solid var(--c);animation:ru-ring .9s ease-out .75s both}
.ru-rays{inset:-60%;background:repeating-conic-gradient(from 0deg,var(--c) 0 6deg,transparent 6deg 18deg);-webkit-mask-image:radial-gradient(circle,#000 0,transparent 62%);mask-image:radial-gradient(circle,#000 0,transparent 62%);opacity:.5;animation:ru-in .6s ease-out .6s both,ru-spin 14s linear .6s infinite}
.ru-shimmer{border-radius:30%;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.65) 50%,transparent 65%);background-size:250% 100%;mix-blend-mode:overlay;animation:ru-sheen 1s ease-in-out 1.15s both}
.ru-spark{position:absolute;left:50%;top:55%;border-radius:9999px;animation:ru-spark var(--d) ease-out var(--dl) infinite both}
.ru-text{animation:ru-in .6s ease-out 1.2s both}
@keyframes ru-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px) rotate(-3deg)}40%{transform:translateX(6px) rotate(3deg)}60%{transform:translateX(-5px) rotate(-2deg)}80%{transform:translateX(5px) rotate(2deg)}}
@keyframes ru-frag{to{transform:translate(var(--dx),var(--dy)) rotate(var(--r));opacity:0;filter:blur(4px)}}
@keyframes ru-slam{0%{transform:scale(3);opacity:0}55%{transform:scale(.9);opacity:1}80%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes ru-ring{0%{transform:scale(.4);opacity:.9}100%{transform:scale(3.2);opacity:0}}
@keyframes ru-spin{to{transform:rotate(360deg)}}
@keyframes ru-in{from{opacity:0;transform:translateY(8px)}to{opacity:1}}
@keyframes ru-sheen{from{background-position:150% 0;opacity:1}to{background-position:-50% 0;opacity:0}}
@keyframes ru-spark{0%{transform:translate(0,0) scale(1);opacity:0}15%{opacity:1}100%{transform:translate(var(--x),var(--y)) scale(.2);opacity:0}}
@media (prefers-reduced-motion:reduce){
 .ru-shake,.ru-frag,.ru-new,.ru-ring,.ru-rays,.ru-shimmer,.ru-spark,.ru-text{animation:none!important}
 .ru-old,.ru-ring,.ru-rays,.ru-shimmer,.ru-spark{display:none}
}`;

const FRAGS = [
  { clip: "polygon(0 0,60% 0,40% 100%,0 100%)", dx: "-70px", dy: "-30px", r: "-25deg" },
  { clip: "polygon(60% 0,100% 0,100% 55%,40% 100%)", dx: "70px", dy: "-40px", r: "30deg" },
  { clip: "polygon(40% 100%,100% 55%,100% 100%)", dx: "40px", dy: "80px", r: "45deg" },
];

const SPARKS = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  const dist = 90 + ((i * 37) % 70);
  return { x: Math.cos(a) * dist, y: Math.sin(a) * dist - 60, d: 1.6 + ((i * 13) % 10) / 10, dl: 0.7 + ((i * 7) % 12) / 10, s: 3 + (i % 3) * 2, gold: i % 2 === 0 };
});

export default function RankUpModal({ event, onClose }: { event: RankUpEvent | null; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!event) return;
    btn.current?.focus();
    const stop = fanfare();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      stop();
      window.removeEventListener("keydown", key);
    };
  }, [event, onClose]);

  if (!event) return null;
  const { from, to } = event;
  const c = to.tier.color;

  return (
    <div
      data-testid="rank-up-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Rank up"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-4 backdrop-blur-md"
      style={{ ["--c" as string]: c }}
    >
      <style>{CSS}</style>
      <div className="relative w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <div className="ru-stage" aria-hidden>
          <div className="ru-abs ru-rays" />
          <div className="ru-abs ru-ring" />
          <div className="ru-abs ru-old ru-shake">
            {FRAGS.map((f, i) => (
              <div key={i} className="ru-abs ru-frag" style={{ clipPath: f.clip, ["--dx" as string]: f.dx, ["--dy" as string]: f.dy, ["--r" as string]: f.r }}>
                <RankBadge tier={from.tier} size={180} className="ru-b" />
              </div>
            ))}
          </div>
          <div className="ru-abs ru-new">
            <RankBadge tier={to.tier} size={180} className="ru-b" />
            <div className="ru-abs ru-shimmer" />
          </div>
          {SPARKS.map((p, i) => (
            <span key={i} className="ru-spark" style={{ width: p.s, height: p.s, background: p.gold ? "#FFD700" : c, boxShadow: `0 0 6px ${p.gold ? "#FFD700" : c}`, ["--x" as string]: `${p.x}px`, ["--y" as string]: `${p.y}px`, ["--d" as string]: `${p.d}s`, ["--dl" as string]: `${p.dl}s` }} />
          ))}
        </div>
        <div className="ru-text mt-8">
          <div className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: c }}>Rank Up</div>
          <div className="mt-1 text-xl font-bold">{event.label}</div>
          <div className="mt-3 flex items-center justify-center gap-2 text-lg font-bold">
            <span style={{ color: from.tier.color }}>{from.tier.name}</span>
            <ArrowRight size={18} className="text-muted" aria-label="to" />
            <span style={{ color: c }}>{to.tier.name}</span>
          </div>
          <div className="mt-1 text-sm text-muted tabular-nums">
            {to.score} / 1000 | {to.lp} Lift Points
          </div>
          <div className="mx-auto mt-4 rounded-lg border border-line bg-card-2 px-3 py-2 text-sm">
            <span className="font-bold text-accent tabular-nums">+{event.xp} Experience Points</span> for your companion
            <div className="text-xs text-muted">Banked when you finish the workout.</div>
          </div>
          <button ref={btn} onClick={onClose} className="mt-5 h-11 w-full rounded-lg bg-accent font-bold text-black">Keep lifting</button>
        </div>
      </div>
    </div>
  );
}

export { RankUpModal };
