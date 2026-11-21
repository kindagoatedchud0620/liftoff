"use client";

import Link from "next/link";
import { useMemo } from "react";
import Bodygraph from "@/components/Bodygraph";
import StreakCard from "@/components/gamification/StreakCard";
import { Card, CardTitle, fmtDate, fmtNum, LpBar, Stat, TierBadge } from "@/components/ui";
import { EXERCISE_MAP } from "@/data/exercises";
import { nextTier } from "@/lib/ranking";
import { prFeed, weekKey, weeklyVolume } from "@/lib/stats";
import { useNow, useRanks } from "@/store/derived";
import { useStore } from "@/store/useStore";

export default function Home() {
  const { bests, overall, muscles } = useRanks();
  const workouts = useStore((s) => s.workouts);
  const profile = useStore((s) => s.profile);
  const now = useNow();

  const topLifts = useMemo(() => Object.values(bests).sort((a, b) => b.rank.score - a.rank.score).slice(0, 6), [bests]);
  const prs = useMemo(() => prFeed(workouts, profile).slice(0, 4), [workouts, profile]);
  const last7 = workouts.filter((w) => now - Date.parse(w.date) <= 7 * 86_400_000).length;
  const weekTonnage = weeklyVolume(workouts).find((w) => w.week === weekKey(new Date(now).toISOString()))?.tonnage ?? 0;

  const next = overall ? nextTier(overall.tier) : null;
  const color = overall?.tier.color ?? "#9ca3af";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardTitle>Overall Liftoff Rank</CardTitle>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-4xl font-black uppercase tracking-wide sm:text-5xl"
              style={{ color, textShadow: overall?.tier.index === 8 ? `0 0 18px ${color}` : undefined }}
            >
              {overall ? overall.tier.name : "Unranked"}
            </div>
            <div className="mt-1 text-sm text-muted">
              {profile.name}
              {profile.equippedTitle && <span className="text-accent"> / {profile.equippedTitle}</span>}
            </div>
          </div>
          <div className="text-right text-2xl font-bold tabular-nums">
            {overall?.score ?? 0}
            <span className="text-sm font-normal text-muted"> / 1000</span>
          </div>
        </div>
        {overall && (
          <div className="mt-4">
            <LpBar rank={overall} showLabel={false} />
            <div className="mt-1 text-xs text-muted tabular-nums">
              {next ? `${100 - overall.lp} LP to ${next.name}` : "Max rank reached"}
            </div>
          </div>
        )}
      </Card>

      <div className="lg:col-span-4">
        <StreakCard />
      </div>

      <Card className="lg:col-span-8">
        <CardTitle>Bodygraph</CardTitle>
        <Bodygraph muscles={muscles} />
      </Card>

      <div className="flex flex-col gap-4 lg:col-span-4">
        <Link
          href="/log"
          className="rounded-xl bg-accent px-4 py-3 text-center text-base font-bold text-bg transition-opacity hover:opacity-90"
        >
          + Log Workout
        </Link>

        <Card>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="7 days" value={last7} />
            <Stat label="Total" value={workouts.length} />
            <Stat label="Week lb" value={fmtNum(weekTonnage)} />
          </div>
        </Card>

        <Card>
          <CardTitle>Top Lifts</CardTitle>
          {topLifts.length ? (
            <ul className="space-y-3">
              {topLifts.map((b) => (
                <li key={b.exerciseId}>
                  <Link href={`/gains?ex=${b.exerciseId}`} className="block rounded-lg hover:bg-card-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold">{EXERCISE_MAP[b.exerciseId].name}</span>
                      <TierBadge tier={b.rank.tier} />
                    </div>
                    <div className="mb-1 text-xs text-muted tabular-nums">e1RM {Math.round(b.e1rm)} lb</div>
                    <LpBar rank={b.rank} showLabel={false} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Log a workout to see your top lifts.</p>
          )}
        </Card>

        <Card>
          <CardTitle>Recent PRs</CardTitle>
          {prs.length ? (
            <ul className="space-y-2">
              {prs.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{EXERCISE_MAP[p.exerciseId]?.name}</div>
                    <div className="text-xs text-muted tabular-nums">
                      {p.kind === "e1rm" ? `e1RM ${p.value} lb` : `Set volume ${fmtNum(p.value)} lb`} (was {fmtNum(p.previous)})
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{fmtDate(p.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No PRs yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
