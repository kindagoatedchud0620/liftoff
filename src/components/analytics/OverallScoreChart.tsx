"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TIERS } from "@/lib/ranking";
import { overallHistory } from "@/lib/stats";
import { useStore } from "@/store/useStore";
import { Card, CardTitle } from "@/components/ui";
import { ACCENT, GRID, TICK, TOOLTIP, inRange, shortDate, useCutoff, type Range } from "./range";

export function OverallScoreChart({ range }: { range: Range }) {
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  const cutoff = useCutoff(range);
  const data = useMemo(
    () => overallHistory(workouts, profile).filter((d) => inRange(d.week, cutoff)).map((d) => ({ ...d, label: shortDate(d.week) })),
    [workouts, profile, cutoff],
  );
  const scores = data.map((d) => d.score);
  const lo = Math.max(0, Math.min(...scores) - 30);
  const hi = Math.min(1000, Math.max(...scores) + 30);

  return (
    <Card>
      <CardTitle>Overall Score</CardTitle>
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted">No data in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={TICK} stroke={GRID} minTickGap={30} />
              <YAxis domain={[lo, hi]} tick={TICK} stroke={GRID} width={34} tickCount={5} allowDecimals={false} />
              <Tooltip {...TOOLTIP} formatter={(v) => [v, "Score"]} />
              {TIERS.filter((t) => t.index > 0 && t.min >= lo && t.min <= hi).map((t) => (
                <ReferenceLine
                  key={t.name}
                  y={t.min}
                  stroke={t.color}
                  strokeOpacity={0.35}
                  strokeDasharray="3 5"
                  label={{ value: t.name, fill: t.color, fontSize: 10, position: "insideTopLeft" }}
                />
              ))}
              <Line type="monotone" dataKey="score" stroke={ACCENT} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
