"use client";

import Link from "next/link";
import { Card, CardTitle, fmtNum } from "@/components/ui";
import { useCompanionMood, usePet, useRanks } from "@/store/derived";
import CompanionNameEditor from "./CompanionNameEditor";
import CompanionSpeechBubble from "./CompanionSpeechBubble";
import TrainingArena3D from "./TrainingArena3D";

export default function PetCard() {
  const pet = usePet();
  const { arena, tired } = useCompanionMood();
  const accent = useRanks().overall?.tier.color ?? "#38BDF8";
  const span = pet.nextLevelXp - pet.levelStartXp;
  const pct = Math.max(0, Math.min(100, ((pet.xp - pet.levelStartXp) / span) * 100));
  return (
    <Card>
      <CardTitle>Companion</CardTitle>
      <CompanionNameEditor size="md" />
      <div className="relative">
        <CompanionSpeechBubble className="absolute inset-x-2 top-2 z-10" />
        <TrainingArena3D arena={arena} stage={pet.stage.index} accent={accent} tired={tired} height={240} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-line bg-card-2 px-2 py-0.5 text-[11px] font-bold tabular-nums">Level {pet.level}</span>
        <span className="text-sm text-muted">{pet.stage.name}</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
      </div>
      <div className="mt-1 text-[11px] text-muted tabular-nums">
        {fmtNum(pet.xp - pet.levelStartXp)} / {fmtNum(span)} Experience Points
      </div>
      <Link href="/companion" className="mt-3 inline-block text-sm font-medium text-accent">
        Open Companion
      </Link>
    </Card>
  );
}
