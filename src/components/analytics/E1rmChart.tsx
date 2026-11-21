"use client";

import { useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EXERCISE_MAP } from "@/data/exercises";
import { TIERS, e1rmForScore } from "@/lib/ranking";
import { e1rmHistory } from "@/lib/stats";
import { useStore } from "@/store/useStore";
import { useRanks } from "@/store/derived";
import { Card, CardTitle, LpBar, TierBadge } from "@/components/ui";
import { GRID, TICK, TOOLTIP, inRange, shortDate, useCutoff, type Range } from "./range";

export function E1rmChart({ range }: { range: Range }) {
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  const { bests } = useRanks();
  const param = useSearchParams().get("ex");
  const gid = useId().replace(/:/g, "");
  const cutoff = useCutoff(range);

  const logged = useMemo(
    () => Object.keys(bests).filter((id) => EXERCISE_MAP[id]).sort((a, b) => EXERCISE_MAP[a].name.localeCompare(EXERCISE_MAP[b].name)),
    [bests],
  );
  const [picked, setPicked] = useState<string | null>(param && EXERCISE_MAP[param] ? param : null);
  const id = picked && logged.includes(picked) ? picked : logged.includes("bench-press") ? "bench-press" : logged[0];

  const data = useMemo(
    () => (id ? e1rmHistory(workouts, id, profile).filter((d) => inRange(d.date, cutoff)).map((d) => ({ ...d, label: shortDate(d.date) })) : []),
    [workouts, id, profile, cutoff],
  );

  if (!id) {
    return (
      <Card>
        <CardTitle>Estimated 1RM</CardTitle>
        <p className="text-sm text-muted">Log a workout to see your e1RM progress.</p>
      </Card>
    );
  }

  const ex = EXERCISE_MAP[id];
  const best = bests[id];
  const tier = best.rank.tier;
  const lines = TIERS.filter((t) => t.index >= tier.index && t.index <= tier.index + 3).map((t) => ({
    t,
    y: Math.round(e1rmForScore(ex, t.min, profile.bodyweight, profile.sex)),
  }));
  const next = lines.find((l) => l.t.index === tier.index + 1);
  const vals = data.map((d) => d.e1rm);
  const lo = Math.floor((Math.min(...(vals.length ? vals : [best.e1rm])) * 0.95) / 5) * 5;
  const hi = Math.ceil((Math.max(...vals, next?.y ?? 0, best.e1rm) * 1.03) / 5) * 5;

  return (
    <Card>
      <CardTitle
        right={
          <select
            value={id}
            onChange={(e) => setPicked(e.target.value)}
            className="max-w-[55%] rounded-md border border-line bg-card-2 px-2 py-1 text-sm"
            aria-label="Exercise"
          >
            {logged.map((x) => (
              <option key={x} value={x}>
                {EXERCISE_MAP[x].name}
              </option>
            ))}
          </select>
        }
      >
        Estimated 1RM
      </CardTitle>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-3xl font-bold tabular-nums">
          {Math.round(best.e1rm)} <span className="text-sm font-normal text-muted">lb</span>
        </div>
        <TierBadge tier={tier} />
        <div className="w-32">
          <LpBar rank={best.rank} />
        </div>
      </div>
      <div className="h-72 w-full">
        {data.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted">No sessions in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tier.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={tier.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={TICK} stroke={GRID} minTickGap={30} />
              <YAxis domain={[lo, hi]} tick={TICK} stroke={GRID} width={38} tickCount={5} allowDecimals={false} />
              <Tooltip {...TOOLTIP} formatter={(v) => [`${v} lb`, "e1RM"]} />
              {lines.map(({ t, y }) => (
                <ReferenceLine
                  key={t.name}
                  y={y}
                  stroke={t.color}
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  ifOverflow="hidden"
                  label={{ value: `${t.name} ${y}`, fill: t.color, fontSize: 10, position: "insideTopLeft" }}
                />
              ))}
              <Area type="monotone" dataKey="e1rm" stroke={tier.color} strokeWidth={2} fill={`url(#${gid})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
