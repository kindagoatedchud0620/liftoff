"use client";

import Link from "next/link";
import { Card, CardTitle } from "@/components/ui";
import ProgressBar from "./ProgressBar";
import TrophyMedal from "./TrophyMedal";
import { useTrophies } from "./useTrophies";

export default function TrophySummary() {
  const states = useTrophies();
  const unlocked = states.filter((t) => t.unlocked);
  const closest = states.filter((t) => !t.unlocked).sort((a, b) => b.fraction - a.fraction)[0];
  return (
    <Card>
      <div data-testid="trophy-summary">
        <CardTitle>Trophy Case</CardTitle>
        {unlocked.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {unlocked.map((t) => <TrophyMedal key={t.def.id} state={t} size={44} />)}
          </div>
        )}
        <div className="text-sm font-semibold tabular-nums">{unlocked.length} of {states.length} unlocked</div>
        {closest && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-semibold">Next: {closest.def.name}</div>
            <ProgressBar state={closest} />
          </div>
        )}
        <Link href="/trophies" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
          View Trophy Case
        </Link>
      </div>
    </Card>
  );
}
