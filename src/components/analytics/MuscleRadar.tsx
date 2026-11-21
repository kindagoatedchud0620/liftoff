"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { radarData } from "@/lib/stats";
import { useRanks } from "@/store/derived";
import { Card, CardTitle } from "@/components/ui";
import { ACCENT, TICK } from "./range";

export function MuscleRadar() {
  const { muscles } = useRanks();
  const data = radarData(muscles);
  const trained = data.filter((d) => d.score > 0);
  const weak = trained.length ? trained.reduce((a, b) => (b.score < a.score ? b : a)) : null;
  const strong = trained.length ? trained.reduce((a, b) => (b.score > a.score ? b : a)) : null;

  return (
    <Card>
      <CardTitle>Muscle Balance</CardTitle>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#1F2937" />
            <PolarAngleAxis dataKey="group" tick={TICK} />
            {/* Scale to the tier ceiling above the strongest group so imbalances are visible. */}
            <PolarRadiusAxis domain={[0, Math.min(1000, Math.ceil(((strong?.score ?? 0) + 1) / 110) * 110)]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke={ACCENT} fill={ACCENT} fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {weak && strong && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-card-2 p-2">
            <div className="text-[11px] uppercase tracking-wider text-muted">Lagging</div>
            <div className="font-semibold">
              {weak.group} <span className="tabular-nums text-muted">{weak.score}</span>
            </div>
          </div>
          <div className="rounded-lg bg-card-2 p-2">
            <div className="text-[11px] uppercase tracking-wider text-muted">Strong</div>
            <div className="font-semibold">
              {strong.group} <span className="tabular-nums text-muted">{strong.score}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
