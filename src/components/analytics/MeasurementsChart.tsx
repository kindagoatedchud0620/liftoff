"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Measurement } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { Card, CardTitle } from "@/components/ui";
import { GRID, TICK, TOOLTIP, inRange, shortDate, useCutoff, type Range } from "./range";

type Key = Exclude<keyof Measurement, "date">;
// Bodyweight (lb) on the left axis; body fat (%) on the right.
const METRICS: { key: Key; label: string; unit: string; color: string; axis: "l" | "r" }[] = [
  { key: "bodyweight", label: "Bodyweight", unit: "lb", color: "#38BDF8", axis: "l" },
  { key: "bodyFat", label: "Body Fat Percentage", unit: "%", color: "#F43F5E", axis: "r" },
];

export function MeasurementsChart({ range }: { range: Range }) {
  const all = useStore((s) => s.measurements);
  const cutoff = useCutoff(range);
  const [on, setOn] = useState<Key[]>(["bodyweight", "bodyFat"]);
  const data = useMemo(() => all.filter((m) => inRange(m.date, cutoff)).map((m) => ({ ...m, label: shortDate(m.date) })), [all, cutoff]);
  const active = METRICS.filter((m) => on.includes(m.key));
  const toggle = (k: Key) => setOn((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));

  return (
    <Card>
      <CardTitle>Measurements</CardTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        {METRICS.map((m) => {
          const sel = on.includes(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              aria-pressed={sel}
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={sel ? { color: m.color, borderColor: m.color, background: `${m.color}1a` } : { color: "#9CA3AF", borderColor: "#1F2937" }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted">No measurements in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={TICK} stroke={GRID} minTickGap={30} />
              <YAxis yAxisId="l" hide={!active.some((m) => m.axis === "l")} domain={["auto", "auto"]} tick={TICK} stroke={GRID} width={34} tickCount={5} />
              <YAxis yAxisId="r" orientation="right" hide={!active.some((m) => m.axis === "r")} domain={["auto", "auto"]} tick={TICK} stroke={GRID} width={30} tickCount={5} />
              <Tooltip {...TOOLTIP} />
              {active.map((m) => (
                <Line key={m.key} yAxisId={m.axis} type="monotone" dataKey={m.key} name={`${m.label} (${m.unit})`} stroke={m.color} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {data.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {METRICS.map((m) => {
            const last = data[data.length - 1][m.key];
            const d = +(last - data[0][m.key]).toFixed(1);
            return (
              <div key={m.key} className="rounded-lg bg-card-2 p-2">
                <div className="text-[11px] uppercase leading-tight tracking-wider text-muted">{m.label}</div>
                <div className="font-bold tabular-nums">
                  {last} <span className="text-xs font-normal text-muted">{m.unit}</span>
                </div>
                <div className="text-xs tabular-nums text-muted">
                  {d > 0 ? "+" : ""}
                  {d}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
