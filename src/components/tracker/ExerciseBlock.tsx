"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { EXERCISE_MAP } from "@/data/exercises";
import { rankFromE1rm } from "@/lib/ranking";
import type { WorkoutExercise, WorkoutSet } from "@/lib/types";
import { liveSetRank, useStore } from "@/store/useStore";
import { useRanks } from "@/store/derived";
import { TierBadge } from "@/components/ui";
import type { RankUp } from "./RankUpModal";

const field = "h-11 w-full min-w-0 rounded-lg border border-line bg-card-2 px-2 text-center text-base tabular-nums outline-none focus:border-accent";
const num = (v: string) => (v === "" ? 0 : Math.max(0, parseFloat(v) || 0));

function SetRow({ exIdx, idx, set, exerciseId, onCheck }: { exIdx: number; idx: number; set: WorkoutSet; exerciseId: string; onCheck: (idx: number) => void }) {
  const updateSet = useStore((s) => s.updateSet);
  const removeSet = useStore((s) => s.removeSet);
  const profile = useStore((s) => s.profile);
  const live = set.reps > 0 ? liveSetRank(exerciseId, set, profile) : null;
  const showBadge = live && live.e1rm > 0;
  return (
    <div className={`rounded-lg p-1 ${set.done ? "bg-accent/10" : ""}`}>
      <div className="grid grid-cols-[1.25rem_1fr_1fr_3.5rem_2.5rem_2rem] items-center gap-1.5">
        <span className="text-center text-xs text-muted tabular-nums">{idx + 1}</span>
        <input data-testid="set-weight" type="number" inputMode="decimal" min={0} step="any" placeholder="lb" aria-label={`Set ${idx + 1} weight in pounds`} className={field} value={set.weight || ""} onChange={(e) => updateSet(exIdx, idx, { weight: num(e.target.value) })} />
        <input data-testid="set-reps" type="number" inputMode="numeric" min={0} step={1} placeholder="reps" aria-label={`Set ${idx + 1} reps`} className={field} value={set.reps || ""} onChange={(e) => updateSet(exIdx, idx, { reps: Math.floor(num(e.target.value)) })} />
        <input data-testid="set-rpe" type="number" inputMode="decimal" min={6} max={10} step={0.5} placeholder="RPE" aria-label={`Set ${idx + 1} RPE`} className={field} value={set.rpe ?? ""} onChange={(e) => updateSet(exIdx, idx, { rpe: e.target.value === "" ? undefined : Math.min(10, Math.max(6, parseFloat(e.target.value) || 6)) })} />
        <button data-testid="set-check" aria-label={set.done ? `Uncheck set ${idx + 1}` : `Complete set ${idx + 1}`} aria-pressed={set.done} onClick={() => onCheck(idx)} className={`flex h-11 items-center justify-center rounded-lg border ${set.done ? "border-accent bg-accent text-black" : "border-line text-muted"}`}>
          <Check size={18} />
        </button>
        <button aria-label={`Delete set ${idx + 1}`} onClick={() => removeSet(exIdx, idx)} className="flex h-11 items-center justify-center text-muted hover:text-red-400"><Trash2 size={15} /></button>
      </div>
      {showBadge && (
        <div data-testid="set-rank-badge" className="mt-1 flex items-center gap-2 pl-7 text-xs text-muted">
          <TierBadge tier={live.rank.tier} />
          <span className="tabular-nums">e1RM {live.e1rm} lb</span>
        </div>
      )}
    </div>
  );
}

export default function ExerciseBlock({ exIdx, we, onRankUp }: { exIdx: number; we: WorkoutExercise; onRankUp: (u: RankUp) => void }) {
  const ex = EXERCISE_MAP[we.exerciseId];
  const updateSet = useStore((s) => s.updateSet);
  const addSet = useStore((s) => s.addSet);
  const removeExercise = useStore((s) => s.removeExercise);
  const startRest = useStore((s) => s.startRest);
  const profile = useStore((s) => s.profile);
  const best = useRanks().bests[we.exerciseId];

  const onCheck = (idx: number) => {
    const s = we.sets[idx];
    if (s.done) return updateSet(exIdx, idx, { done: false });
    updateSet(exIdx, idx, { done: true });
    startRest();
    if (s.reps <= 0) return;
    const now = liveSetRank(we.exerciseId, s, profile);
    const others = we.sets.filter((o, j) => j !== idx && o.done && o.reps > 0).map((o) => liveSetRank(we.exerciseId, o, profile).e1rm);
    const prior = Math.max(best?.e1rm ?? 0, ...others);
    if (prior <= 0) return;
    const from = rankFromE1rm(ex, prior, profile.bodyweight, profile.sex).tier;
    if (now.rank.tier.index > from.index) onRankUp({ exerciseId: we.exerciseId, from, rank: now.rank, e1rm: now.e1rm });
  };

  return (
    <section className="rounded-xl border border-line bg-card p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{ex?.name ?? we.exerciseId}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {best ? (
              <>
                <TierBadge tier={best.rank.tier} />
                <span className="tabular-nums">Prev best e1RM {Math.round(best.e1rm)} lb</span>
              </>
            ) : (
              <span>No previous best</span>
            )}
          </div>
        </div>
        <button aria-label={`Remove ${ex?.name ?? "exercise"}`} onClick={() => removeExercise(exIdx)} className="p-1 text-muted hover:text-red-400"><Trash2 size={16} /></button>
      </div>
      <div className="grid grid-cols-[1.25rem_1fr_1fr_3.5rem_2.5rem_2rem] gap-1.5 px-1 pb-1 text-center text-[10px] uppercase tracking-wider text-muted">
        <span>#</span><span>lb</span><span>Reps</span><span>RPE</span><span /><span />
      </div>
      <div className="space-y-1">
        {we.sets.map((s, i) => <SetRow key={s.id} exIdx={exIdx} idx={i} set={s} exerciseId={we.exerciseId} onCheck={onCheck} />)}
      </div>
      <button onClick={() => addSet(exIdx)} className="mt-2 flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line text-sm text-muted hover:border-accent hover:text-accent">
        <Plus size={14} />Add set
      </button>
    </section>
  );
}
