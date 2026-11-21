"use client";

import { Card } from "@/components/ui";
import QuestsPanel from "@/components/gamification/QuestsPanel";
import Shop from "@/components/gamification/Shop";
import StreakCard from "@/components/gamification/StreakCard";
import { EGGS } from "@/lib/gamification";
import { useStore } from "@/store/useStore";

export default function QuestsPage() {
  const eggs = useStore((s) => s.eggs);
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Quests and Shop</h1>
          <span className="text-xl font-bold text-accent tabular-nums">{eggs} Eggs</span>
        </div>
        <p className="mt-2 text-xs text-muted tabular-nums">
          Earn Eggs: workout +{EGGS.workout}, PR +{EGGS.pr}, rank-up +{EGGS.rankUp}. Quests pay extra.
        </p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <StreakCard />
          <QuestsPanel />
        </div>
        <Shop />
      </div>
    </div>
  );
}
