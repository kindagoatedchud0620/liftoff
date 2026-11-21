"use client";

import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { weeklyVolume } from "@/lib/stats";
import { useStore } from "@/store/useStore";
import { Card, CardTitle } from "@/components/ui";
import { ACCENT, GRID, TICK, TOOLTIP, inRange, shortDate, useCutoff, type Range } from "./range";

const RPE = "Average Rate of Perceived Exertion";
const k = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v));

export function VolumeChart({ range }: { range: Range }) {
  const workouts = useStore((s) => s.workouts);
  const cutoff = useCutoff(range);
  const data = useMemo(
    () => weeklyVolume(workouts).filter((d) => inRange(d.week, cutoff)).map((d) => ({ ...d, label: shortDate(d.week) })),
    [workouts, cutoff],
  );

  return (
    <Card>
      <CardTitle>Weekly Volume</CardTitle>
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted">No data in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={TICK} stroke={GRID} minTickGap={30} />
              <YAxis yAxisId="l" tick={TICK} stroke={GRID} width={34} tickFormatter={k} tickCount={5} />
              <YAxis yAxisId="r" orientation="right" domain={[6, 10]} tick={TICK} stroke={GRID} width={26} ticks={[6, 7, 8, 9, 10]} />
              <Tooltip {...TOOLTIP} formatter={(v, name) => (name === "Tonnage" ? [`${Number(v).toLocaleString("en-US")} lb`, name] : [v, RPE])} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="l" dataKey="tonnage" name="Tonnage" fill={ACCENT} fillOpacity={0.55} radius={[3, 3, 0, 0]} />
              <Line yAxisId="r" type="monotone" dataKey="avgRpe" name={RPE} stroke="#F97316" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
