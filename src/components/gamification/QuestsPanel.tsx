"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { Card, CardTitle, fmtNum } from "@/components/ui";
import { questStates } from "@/lib/gamification";
import { useStore } from "@/store/useStore";
import { useNow } from "@/store/derived";

function countdown(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d ? `${d}d ${h}h` : `${h}h ${m % 60}m`;
}

export default function QuestsPanel() {
  const workouts = useStore((s) => s.workouts);
  const profile = useStore((s) => s.profile);
  const claimed = useStore((s) => s.claimedQuests);
  const claimQuest = useStore((s) => s.claimQuest);
  const now = useNow();
  const states = useMemo(() => questStates(workouts, profile, claimed, now), [workouts, profile, claimed, now]);

  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (((8 - d.getDay()) % 7) || 7)).getTime();

  return (
    <div className="space-y-4">
      {(["daily", "weekly"] as const).map((period) => (
        <Card key={period}>
          <CardTitle right={<span className="text-xs text-muted tabular-nums">Resets in {countdown((period === "daily" ? midnight : monday) - now)}</span>}>
            {period} quests
          </CardTitle>
          <ul className="space-y-4">
            {states.filter((q) => q.def.period === period).map((q) => {
              const shown = Math.min(q.progress, q.def.target);
              return (
                <li key={q.key} data-testid={`quest-${q.def.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 text-sm font-semibold">{q.def.title}</span>
                    {q.claimed ? (
                      <span className="flex items-center gap-1 text-xs text-accent" aria-label="Claimed"><Check size={16} />Claimed</span>
                    ) : q.complete ? (
                      <button onClick={() => claimQuest(q.key, q.def.reward)} className="h-9 shrink-0 rounded-lg bg-accent px-3 text-sm font-bold text-black tabular-nums">Claim +{q.def.reward}</button>
                    ) : (
                      <span className="shrink-0 text-xs text-muted tabular-nums">+{q.def.reward} Eggs</span>
                    )}
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(shown / q.def.target) * 100}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-muted tabular-nums">{fmtNum(Math.round(shown))}/{fmtNum(q.def.target)}</div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
