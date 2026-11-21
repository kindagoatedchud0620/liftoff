"use client";

import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { EXERCISE_MAP } from "@/data/exercises";
import { EGGS } from "@/lib/gamification";
import type { Rank, Tier } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { TierBadge } from "@/components/ui";

export interface RankUp {
  exerciseId: string;
  from: Tier;
  rank: Rank;
  e1rm: number;
}

const PIECES = Array.from({ length: 24 }, (_, i) => i);

export default function RankUpModal({ up, onClose }: { up: RankUp; onClose: () => void }) {
  const doubleEggs = useStore((s) => s.doubleEggs);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const c = up.rank.tier.color;

  return (
    <div data-testid="rank-up-modal" role="dialog" aria-modal="true" aria-label="Rank up" className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/80 p-4">
      <style>{`@keyframes ru-fall{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0.2}}`}</style>
      {PIECES.map((i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute top-0 h-2 w-1.5 rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: i % 2 ? c : "#fde68a", animation: `ru-fall ${2.4 + (i % 5) * 0.4}s linear ${(i % 7) * 0.2}s infinite` }}
        />
      ))}
      <div className="pop-in relative w-full max-w-sm rounded-2xl border bg-card p-6 text-center" style={{ borderColor: `${c}88`, boxShadow: `0 0 60px 8px ${c}55`, backgroundImage: `radial-gradient(circle at 50% 0%, ${c}44, transparent 70%)` }}>
        <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: c }}>Rank up</div>
        <div className="mt-1 text-xl font-bold">{EXERCISE_MAP[up.exerciseId]?.name}</div>
        <div className="my-5 flex items-center justify-center gap-3">
          <TierBadge tier={up.from} size="lg" />
          <ArrowRight size={20} className="text-muted" aria-hidden />
          <TierBadge tier={up.rank.tier} size="lg" />
        </div>
        <div className="text-sm text-muted tabular-nums">
          Score {up.rank.score} / 1000 | {up.rank.lp} LP | e1RM {up.e1rm} lb
        </div>
        <div className="mt-4 rounded-lg border border-line bg-card-2 px-3 py-2 text-sm">
          <span className="font-bold text-accent tabular-nums">+{EGGS.rankUp} Eggs</span>
          {doubleEggs && <span className="text-accent"> (2x active)</span>}
          <div className="text-xs text-muted">Banked when you finish the workout.</div>
        </div>
        <button autoFocus onClick={onClose} className="mt-5 h-11 w-full rounded-lg bg-accent font-bold text-black">Keep lifting</button>
      </div>
    </div>
  );
}
