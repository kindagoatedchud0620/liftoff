"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { CardTitle, fmtNum } from "@/components/ui";
import { ARENAS, isArenaUnlocked } from "@/lib/arenas";
import { useCompanionMood, useRanks } from "@/store/derived";
import { useStore } from "@/store/useStore";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Arena picker: unlocked arenas can be chosen, locked ones show the score needed. */
export default function ArenaSelector() {
  const picked = useStore((s) => s.arenaId);
  const setArena = useStore((s) => s.setArena);
  const score = useRanks().overall?.score ?? 1;
  const { arena: active } = useCompanionMood();

  return (
    <div data-testid="arena-selector" className="min-w-0">
      <CardTitle
        right={
          <button
            type="button"
            data-testid="arena-auto"
            aria-pressed={picked === null}
            onClick={() => setArena(null)}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${FOCUS} ${picked === null ? "border-accent bg-card-2 text-accent" : "border-line bg-card-2 text-muted"}`}
          >
            Follow my rank
          </button>
        }
      >
        Training arena
      </CardTitle>

      <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible">
        {ARENAS.map((a) => {
          const unlocked = isArenaUnlocked(a.id, score);
          const isActive = unlocked && a.id === active;

          const body: ReactNode = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold leading-snug">{a.name}</span>
                {isActive && <span className="shrink-0 rounded-md border border-accent px-1.5 py-0.5 text-[11px] font-bold text-accent">Active</span>}
              </div>
              <div className="text-xs text-muted">{a.tiers}</div>
              {!unlocked && (
                <div className="mt-auto flex items-center gap-1 text-[11px] text-muted tabular-nums">
                  <Lock size={12} aria-hidden="true" />
                  Unlocks at Overall Score {fmtNum(a.minScore)}
                </div>
              )}
            </>
          );

          if (!unlocked) {
            return (
              <div
                key={a.id}
                data-testid={`arena-${a.id}`}
                data-state="locked"
                aria-disabled="true"
                className="flex min-w-[10.5rem] shrink-0 flex-col gap-2 rounded-xl border border-line bg-card p-3 opacity-50 md:min-w-0"
              >
                {body}
              </div>
            );
          }

          return (
            <button
              key={a.id}
              type="button"
              data-testid={`arena-${a.id}`}
              data-state={isActive ? "active" : "unlocked"}
              aria-pressed={isActive}
              onClick={() => setArena(a.id)}
              className={`flex min-w-[10.5rem] shrink-0 flex-col gap-2 rounded-xl border p-3 text-left md:min-w-0 ${FOCUS} ${isActive ? "border-accent bg-card-2" : "border-line bg-card hover:border-accent"}`}
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
