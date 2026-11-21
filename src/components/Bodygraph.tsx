"use client";

import { useMemo, useState } from "react";
import { EXERCISE_MAP } from "@/data/exercises";
import { TIERS } from "@/lib/ranking";
import { MUSCLE_LABELS, MUSCLES, type MuscleRank } from "@/lib/stats";
import type { Muscle } from "@/lib/types";
import { useRanks } from "@/store/derived";
import { LpBar, TierBadge } from "./ui";

type View = "front" | "back";
interface Region {
  m: Muscle;
  d: string;
}

// Hand-authored left-side shapes (viewer's left, x < 100); the right side is a mirror about x = 100.
const BASE = {
  torso: "M100 58 L84 61 C70 64 62 70 60 84 L64 118 L72 160 L74 196 L100 200 Z",
  arm: "M60 70 C50 72 44 82 43 98 L40 140 L36 178 L30 214 L28 230 L40 232 L46 214 L52 180 L58 140 L64 100 Z",
  leg: "M74 192 L100 198 L100 300 L98 330 L96 380 L98 404 L74 408 L76 380 L72 330 L70 290 L68 240 Z",
};
const SHOULDER = "M64 68 C56 68 48 74 46 88 C48 96 56 100 62 98 C66 90 68 78 70 70 Z";
const UPPER_ARM = "M46 100 C52 102 58 102 62 100 L60 138 C54 140 48 138 44 136 C43 124 44 112 46 100 Z";
const FOREARM = "M44 140 C50 142 56 142 60 140 L54 186 C50 190 44 190 40 188 Z";
const CALF = "M78 304 C86 306 92 306 97 304 L94 366 C90 372 86 372 82 366 C78 346 76 324 78 304 Z";

const FRONT: Region[] = [
  { m: "traps", d: "M100 56 L86 60 L76 68 C84 68 92 64 100 64 Z" },
  { m: "chest", d: "M98 70 L98 112 C88 118 74 114 66 104 C64 92 66 80 76 74 C84 70 92 68 98 70 Z" },
  { m: "frontDelts", d: SHOULDER },
  { m: "biceps", d: UPPER_ARM },
  { m: "forearms", d: FOREARM },
  { m: "abs", d: "M98 116 L98 190 L84 188 C82 160 82 135 86 120 Z M84 120 C76 124 70 130 68 140 L72 186 L82 188 C80 160 80 136 84 120 Z" },
  { m: "quads", d: "M74 198 L98 202 L98 296 C90 300 82 298 78 292 C72 262 72 228 74 198 Z" },
  { m: "calves", d: CALF },
];
const BACK: Region[] = [
  { m: "traps", d: "M100 54 L86 60 L72 68 C76 80 88 92 100 100 Z" },
  { m: "lats", d: "M98 102 L98 150 L82 158 L70 150 C66 130 64 112 68 98 C78 102 88 102 98 102 Z" },
  { m: "rearDelts", d: SHOULDER },
  { m: "triceps", d: UPPER_ARM },
  { m: "forearms", d: FOREARM },
  { m: "glutes", d: "M74 192 L98 190 L98 232 C88 238 76 234 72 220 C70 208 72 198 74 192 Z" },
  { m: "hamstrings", d: "M72 236 C82 240 92 240 98 236 L98 296 C90 300 82 298 78 292 C74 272 72 254 72 236 Z" },
  { m: "calves", d: CALF },
];

const MIRROR = "translate(200 0) scale(-1 1)";
const STATUS: Record<MuscleRank["status"], { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" },
  lagging: { label: "Lagging", cls: "border-red-500/40 bg-red-500/15 text-red-400" },
  balanced: { label: "Balanced", cls: "border-slate-500/40 bg-slate-500/15 text-slate-300" },
  untrained: { label: "Untrained", cls: "border-line bg-card-2 text-muted" },
};

export default function Bodygraph({ muscles }: { muscles: Record<Muscle, MuscleRank> }) {
  const { bests } = useRanks();
  const [view, setView] = useState<View>("front");
  const [picked, setPicked] = useState<Muscle | null>(null);
  const [hover, setHover] = useState<Muscle | null>(null);

  const strongest = useMemo(
    () => MUSCLES.reduce((a, m) => ((muscles[m].rank?.score ?? 0) > (muscles[a].rank?.score ?? 0) ? m : a), MUSCLES[0]),
    [muscles],
  );
  const sel = picked ?? strongest;
  const info = muscles[sel];
  const top = info.topExerciseId ? EXERCISE_MAP[info.topExerciseId] : null;
  const topBest = info.topExerciseId ? bests[info.topExerciseId] : null;
  const st = STATUS[info.status];

  const regions = view === "front" ? FRONT : BACK;
  const shapes = (d: string, extra: object) => (
    <>
      <path d={d} {...extra} />
      <path d={d} transform={MIRROR} {...extra} />
    </>
  );

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-line bg-card-2 p-0.5" role="tablist" aria-label="Body view">
        {(["front", "back"] as View[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`rounded-md px-4 py-1 text-sm font-semibold capitalize transition-colors ${view === v ? "bg-accent text-bg" : "text-muted hover:text-white"}`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="w-full max-w-[220px] shrink-0">
          <svg viewBox="0 0 200 420" className="h-auto w-full" role="group" aria-label={`${view} body muscle map`}>
            <defs>
              <filter id="olympian-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g fill="#1F2937" stroke="#374151" strokeWidth="0.8" strokeLinejoin="round">
              <ellipse cx="100" cy="28" rx="14" ry="17" />
              <rect x="93" y="42" width="14" height="18" />
              {Object.values(BASE).map((d) => <g key={d}>{shapes(d, {})}</g>)}
            </g>
            {regions.map(({ m, d }) => {
              const rank = muscles[m].rank;
              const active = hover === m || sel === m;
              return (
                <g
                  key={m}
                  role="button"
                  tabIndex={0}
                  aria-label={`${MUSCLE_LABELS[m]}, ${rank ? rank.tier.name : "Untrained"}`}
                  aria-pressed={sel === m}
                  className="cursor-pointer outline-none [&:focus-visible>path]:stroke-white"
                  filter={rank?.tier.index === 8 ? "url(#olympian-glow)" : undefined}
                  onMouseEnter={() => {
                    setHover(m);
                    setPicked(m);
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setPicked(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPicked(m);
                    }
                  }}
                >
                  {shapes(d, {
                    fill: rank ? rank.tier.color : "#374151",
                    fillOpacity: rank ? (active ? 1 : 0.85) : 0.35,
                    stroke: active ? "#fff" : "#0b1220",
                    strokeWidth: active ? 1.4 : 0.6,
                    strokeLinejoin: "round",
                  })}
                </g>
              );
            })}
          </svg>
          <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1">
            {TIERS.map((t) => (
              <div key={t.name} className="flex items-center gap-1 text-[10px] text-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: t.color }} />
                {t.name}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full min-w-0 flex-1 rounded-xl border border-line bg-card-2 p-4" aria-live="polite">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold">{MUSCLE_LABELS[sel]}</h3>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
          </div>
          {info.rank ? (
            <div className="space-y-3">
              <TierBadge tier={info.rank.tier} />
              <LpBar rank={info.rank} />
              <div className="text-sm text-muted">
                Score <span className="font-bold text-white tabular-nums">{info.rank.score}</span>
              </div>
              {top && topBest && (
                <div className="border-t border-line pt-3 text-sm">
                  <div className="text-[11px] uppercase tracking-wider text-muted">Top exercise</div>
                  <div className="font-semibold">{top.name}</div>
                  <div className="text-muted tabular-nums">Best e1RM {Math.round(topBest.e1rm)} lb</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">No logged lifts target this muscle yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
