"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { EXERCISE_MAP } from "@/data/exercises";
import { prFeed } from "@/lib/stats";
import { useStore } from "@/store/useStore";
import { Card, CardTitle, TierBadge, fmtDate, fmtNum } from "@/components/ui";
import { inRange, useCutoff, type Range } from "./range";

export function PrFeed({ range }: { range: Range }) {
  const workouts = useStore((s) => s.workouts);
  const profile = useStore((s) => s.profile);
  const cutoff = useCutoff(range);
  const prs = useMemo(() => prFeed(workouts, profile).filter((p) => inRange(p.date, cutoff)).slice(0, 8), [workouts, profile, cutoff]);

  return (
    <Card className="lg:col-span-2">
      <CardTitle>Personal Records</CardTitle>
      {prs.length === 0 ? (
        <p className="text-sm text-muted">No records in this range.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {prs.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-lg border border-line bg-card-2 p-3">
              <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{EXERCISE_MAP[p.exerciseId]?.name ?? p.exerciseId}</span>
                  <span className="shrink-0 text-xs text-muted">{fmtDate(p.date)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                    {p.kind === "e1rm" ? "One-Rep Max Record" : "Volume Record"}
                  </span>
                  <span className="text-sm tabular-nums">
                    {fmtNum(p.value)} lb <span className="text-muted">vs {fmtNum(p.previous)}</span>{" "}
                    <span className="font-semibold text-emerald-400">+{fmtNum(p.value - p.previous)}</span>
                  </span>
                </div>
                {p.rankUp && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    <TierBadge tier={p.rankUp.from.tier} /> <span aria-hidden>{"→"}</span> <TierBadge tier={p.rankUp.to.tier} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
