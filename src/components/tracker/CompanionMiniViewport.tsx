"use client";

import { useEffect, useRef, useState } from "react";
import TrainingArena3D from "@/components/pet/TrainingArena3D";
import { useCompanionMood, usePet, useRanks } from "@/store/derived";
import { usePetEvents, type PetReaction } from "@/store/petEvents";

/** Corner-docked companion window for the active workout header. Reacts to set checks via usePetEvents. */
export default function CompanionMiniViewport() {
  const { arena } = useCompanionMood();
  const pet = usePet();
  const accent = useRanks().overall?.tier.color ?? "#38BDF8";
  const reaction = usePetEvents((s) => s.reaction);
  const seen = useRef(reaction?.id ?? 0); // ignore a reaction left over from before mount
  const [shown, setShown] = useState<PetReaction["action"] | null>(null);

  useEffect(() => {
    if (!reaction || reaction.id === seen.current) return;
    seen.current = reaction.id;
    setShown(reaction.action);
    const t = setTimeout(() => setShown(null), 4000);
    return () => clearTimeout(t);
  }, [reaction]);

  const status = shown === "CELEBRATE_RECORD" ? `New Personal Record! ${pet.name} is celebrating` : shown === "LIFTING_DUMBBELLS" ? `${pet.name} is lifting with you` : `${pet.name} is ready`;

  return (
    <div data-testid="companion-mini-viewport" className="w-[112px] shrink-0 min-[400px]:w-[132px]">
      <div className="overflow-hidden rounded-xl border border-line bg-card-2">
        <div className="aspect-square w-full">
          <TrainingArena3D arena={arena} tired={false} stage={pet.stage.index} accent={accent} height={132} compact className="h-full w-full" />
        </div>
        <div className="truncate bg-card px-1.5 py-0.5 text-center text-[10px] leading-tight text-muted">{pet.name} | Level {pet.level}</div>
      </div>
      <p data-testid="companion-status" aria-live="polite" className={`mt-1 text-center text-[10px] font-semibold leading-tight ${shown === "CELEBRATE_RECORD" ? "text-yellow-400" : "text-muted"}`}>{status}</p>
    </div>
  );
}
