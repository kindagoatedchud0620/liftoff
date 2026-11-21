"use client";

import { Suspense, useState } from "react";
import { E1rmChart } from "@/components/analytics/E1rmChart";
import { MeasurementsChart } from "@/components/analytics/MeasurementsChart";
import { MuscleRadar } from "@/components/analytics/MuscleRadar";
import { OverallScoreChart } from "@/components/analytics/OverallScoreChart";
import { PrFeed } from "@/components/analytics/PrFeed";
import { VolumeChart } from "@/components/analytics/VolumeChart";
import { RANGES, type Range } from "@/components/analytics/range";

export default function GainsPage() {
  const [range, setRange] = useState<Range>("6M");
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Gains</h1>
        <div className="inline-flex rounded-lg border border-line bg-card p-0.5" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`rounded-md px-3 py-1 text-sm font-medium ${range === r ? "bg-accent text-bg" : "text-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <Suspense fallback={<div className="h-80 rounded-xl border border-line bg-card" />}>
        <E1rmChart range={range} />
      </Suspense>
      <div className="grid gap-4 lg:grid-cols-2">
        <OverallScoreChart range={range} />
        <VolumeChart range={range} />
        <MuscleRadar />
        <MeasurementsChart range={range} />
        <PrFeed range={range} />
      </div>
    </div>
  );
}
