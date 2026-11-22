"use client";

import { useState, useSyncExternalStore } from "react";
import { Card, CardTitle, fmtDate, fmtNum } from "@/components/ui";
import CompanionNameEditor from "@/components/pet/CompanionNameEditor";
import WorkoutPet3D from "@/components/pet/WorkoutPet3D";
import { PET_STAGES, PET_XP } from "@/lib/pet";
import { usePet, useRanks } from "@/store/derived";

const MQ = "(min-width: 768px)";
const subscribeMq = (cb: () => void) => {
  const m = window.matchMedia(MQ);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

const levelRange = (i: number) => {
  const next = PET_STAGES[i + 1];
  const min = PET_STAGES[i].minLevel;
  return next ? `Levels ${min} to ${next.minLevel - 1}` : `Levels ${min} and up`;
};

function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function CompanionPage() {
  const pet = usePet();
  const accent = useRanks().overall?.tier.color ?? "#38BDF8";
  const [preview, setPreview] = useState<number | null>(null);
  const desktop = useSyncExternalStore(subscribeMq, () => window.matchMedia(MQ).matches, () => false);

  const shown = preview ?? pet.stage.index;
  const span = pet.nextLevelXp - pet.levelStartXp;
  const pct = Math.max(0, Math.min(100, ((pet.xp - pet.levelStartXp) / span) * 100));

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header>
        <CompanionNameEditor size="lg" />
        <p className="text-sm text-muted">Your Three-Dimensional Companion</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <WorkoutPet3D stage={shown} accent={accent} height={desktop ? 420 : 320} />
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
            <span>Drag to spin</span>
            {preview !== null && (
              <button onClick={() => setPreview(null)} className="rounded-md border border-line bg-card-2 px-2 py-1 font-medium text-accent">
                Back to current
              </button>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line bg-card-2 px-2.5 py-1 text-sm font-bold tabular-nums">Level {pet.level}</span>
            <span className="font-semibold">{pet.stage.name}</span>
          </div>
          <p className="text-sm text-muted">{pet.stage.blurb}</p>
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
            </div>
            <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-xs text-muted tabular-nums">
              <span>{fmtNum(pet.nextLevelXp - pet.xp)} Experience Points to Level {pet.level + 1}</span>
              <span>{fmtNum(pet.xp)} total Experience Points</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Evolution stages</CardTitle>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {PET_STAGES.map((s, i) => {
            const unlocked = pet.level >= s.minLevel;
            const current = pet.stage.index === s.index;
            return (
              <button
                key={s.index}
                disabled={!unlocked}
                onClick={() => setPreview(current ? null : s.index)}
                aria-pressed={shown === s.index}
                className={`rounded-lg border p-3 text-left ${shown === s.index ? "border-accent bg-card-2" : "border-line bg-card-2"} ${unlocked ? "" : "opacity-50"}`}
              >
                <div className="text-sm font-bold">{s.name}</div>
                <div className="text-[11px] text-muted tabular-nums">{levelRange(i)}</div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-muted tabular-nums">
                  {current ? <span className="font-bold text-accent">Current</span> : unlocked ? <span>Tap to preview</span> : (<><Lock />Unlocks at Level {s.minLevel}</>)}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>How {pet.name} earns Experience Points</CardTitle>
          <ul className="space-y-2 text-sm">
            {[
              ["Completing a workout", PET_XP.workout],
              ["Personal Record", PET_XP.record],
              ["Exercise rank up", PET_XP.exerciseRankUp],
              ["Overall Liftoff Rank up", PET_XP.overallRankUp],
            ].map(([label, n]) => (
              <li key={label} className="flex justify-between gap-2">
                <span>{label}</span>
                <span className="font-bold tabular-nums">+{n}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Recent milestones</CardTitle>
          {pet.milestones.length === 0 ? (
            <p className="text-sm text-muted">Finish a workout to earn your first Experience Points.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {pet.milestones.slice(0, 12).map((m) => (
                <li key={m.id} className="flex items-baseline gap-2">
                  <span className="w-14 shrink-0 text-xs text-muted tabular-nums">{fmtDate(m.date)}</span>
                  <span className="min-w-0 flex-1">{pet.name}: {m.text}</span>
                  <span className="shrink-0 text-xs font-bold text-accent tabular-nums">+{m.xp} Experience Points</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
