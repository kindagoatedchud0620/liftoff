"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { EXERCISE_MAP } from "@/data/exercises";
import { LIMITS, rankFromE1rm } from "@/lib/ranking";
import { exerciseBests, overallRank } from "@/lib/stats";
import { PET_XP } from "@/lib/pet";
import type { RankUpEvent, WorkoutExercise, WorkoutSet } from "@/lib/types";
import { liveSetRank, useStore } from "@/store/useStore";
import { useRanks } from "@/store/derived";
import { usePetEvents } from "@/store/petEvents";
import { TierBadge } from "@/components/ui";
import { RankBadge } from "@/components/ranks/RankBadge";

const field = "h-11 w-full min-w-0 rounded-lg border border-line bg-card-2 px-1 text-center text-base tabular-nums outline-none placeholder:text-[10px] focus:border-accent";
const num = (v: string, max: number) => (v === "" ? 0 : Math.min(max, Math.max(0, parseFloat(v) || 0)));

/** A record beats the prior best Estimated One-Rep Max or single-set volume. No prior history means no record. */
export function isSetRecord(now: { e1rm: number; volume: number }, prior: { e1rm: number; volume: number }): boolean {
  if (prior.e1rm <= 0 && prior.volume <= 0) return false;
  return now.e1rm > prior.e1rm || now.volume > prior.volume;
}

function SetRow({ exIdx, idx, set, exerciseId, onCheck }: { exIdx: number; idx: number; set: WorkoutSet; exerciseId: string; onCheck: (idx: number) => void }) {
  const updateSet = useStore((s) => s.updateSet);
  const removeSet = useStore((s) => s.removeSet);
  const profile = useStore((s) => s.profile);
  const live = set.reps > 0 ? liveSetRank(exerciseId, set, profile) : null;
  const showBadge = live && live.e1rm > 0;
  return (
    <div className={`rounded-lg p-1 ${set.done ? "bg-accent/10" : ""}`}>
      <div className="grid grid-cols-[1.25rem_1fr_1fr_4.5rem_2.5rem_2rem] items-center gap-1.5">
        <span className="text-center text-xs text-muted tabular-nums">{idx + 1}</span>
        <input data-testid="set-weight" type="number" inputMode="decimal" min={0} max={LIMITS.maxWeight} step="any" placeholder="Weight (lb)" aria-label={`Set ${idx + 1} weight in pounds`} className={field} value={set.weight || ""} onChange={(e) => updateSet(exIdx, idx, { weight: num(e.target.value, LIMITS.maxWeight) })} />
        <input data-testid="set-reps" type="number" inputMode="numeric" min={0} max={LIMITS.maxReps} step={1} placeholder="Reps" aria-label={`Set ${idx + 1} reps`} className={field} value={set.reps || ""} onChange={(e) => updateSet(exIdx, idx, { reps: Math.floor(num(e.target.value, LIMITS.maxReps)) })} />
        <input data-testid="set-rpe" type="number" inputMode="decimal" min={6} max={10} step={0.5} placeholder="Exertion" aria-label={`Set ${idx + 1} Rate of Perceived Exertion`} className={field} value={set.rpe ?? ""} onChange={(e) => updateSet(exIdx, idx, { rpe: e.target.value === "" ? undefined : Math.min(10, Math.max(6, parseFloat(e.target.value) || 6)) })} />
        <button data-testid="set-check" aria-label={set.done ? `Uncheck set ${idx + 1}` : `Complete set ${idx + 1}`} aria-pressed={set.done} onClick={() => onCheck(idx)} className={`flex h-11 items-center justify-center rounded-lg border ${set.done ? "border-accent bg-accent text-black" : "border-line text-muted"}`}>
          <Check size={18} />
        </button>
        <button aria-label={`Delete set ${idx + 1}`} onClick={() => removeSet(exIdx, idx)} className="flex h-11 items-center justify-center text-muted hover:text-red-400"><Trash2 size={15} /></button>
      </div>
      {showBadge && (
        <div data-testid="set-rank-badge" className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-7 text-xs text-muted">
          <RankBadge tier={live.rank.tier} size={22} />
          <span className="font-bold uppercase tracking-wider" style={{ color: live.rank.tier.color }}>{live.rank.tier.name}</span>
          <span className="tabular-nums">Estimated One-Rep Max {live.e1rm} lb</span>
        </div>
      )}
    </div>
  );
}

export default function ExerciseBlock({ exIdx, we, onRankUp }: { exIdx: number; we: WorkoutExercise; onRankUp: (events: RankUpEvent[]) => void }) {
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
    // Read state before the check: "before" excludes this set, "after" includes it.
    const { active, workouts } = useStore.getState();
    updateSet(exIdx, idx, { done: true });
    startRest();
    // Nothing to celebrate for an empty set (0 weight on a non-bodyweight move) or a removed exercise.
    if (s.reps <= 0 || !ex || liveSetRank(we.exerciseId, s, profile).e1rm <= 0) return;
    // History plus every other done set of this exercise in the workout (the checked set is still undone in this snapshot).
    const prior = { e1rm: 0, volume: 0 };
    for (const w of active ? [...workouts, active] : workouts)
      for (const e of w.exercises)
        if (e.exerciseId === we.exerciseId)
          for (const o of e.sets)
            if (o.done && o.reps > 0) {
              prior.e1rm = Math.max(prior.e1rm, liveSetRank(we.exerciseId, o, profile).e1rm);
              prior.volume = Math.max(prior.volume, o.weight * o.reps);
            }
    const record = isSetRecord({ e1rm: liveSetRank(we.exerciseId, s, profile).e1rm, volume: s.weight * s.reps }, prior);
    usePetEvents.getState().react(record ? "CELEBRATE_RECORD" : "LIFTING_DUMBBELLS");
    const events: RankUpEvent[] = [];
    const now = liveSetRank(we.exerciseId, s, profile);
    const others = we.sets.filter((o, j) => j !== idx && o.done && o.reps > 0).map((o) => liveSetRank(we.exerciseId, o, profile).e1rm);
    const priorBest = Math.max(best?.e1rm ?? 0, ...others);
    if (priorBest > 0) {
      const from = rankFromE1rm(ex, priorBest, profile.bodyweight, profile.sex);
      if (now.rank.tier.index > from.tier.index) events.push({ label: ex.name, from, to: now.rank, xp: PET_XP.exerciseRankUp });
    } else {
      // First ranked set for this exercise: celebrate the starting rank. The pet only earns for promotions.
      events.push({ label: ex.name, from: null, to: now.rank, xp: 0 });
    }
    if (active) {
      const checked = { ...active, exercises: active.exercises.map((e, i) => (i === exIdx ? { ...e, sets: e.sets.map((o, j) => (j === idx ? { ...o, done: true } : o)) } : e)) };
      const before = overallRank(exerciseBests([...workouts, active], profile));
      const after = overallRank(exerciseBests([...workouts, checked], profile));
      if (before && after && after.tier.index > before.tier.index) events.push({ label: "Overall Liftoff Rank", from: before, to: after, xp: PET_XP.overallRankUp });
    }
    if (events.length) onRankUp(events);
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
                <span className="tabular-nums">Previous best Estimated One-Rep Max {Math.round(best.e1rm)} lb</span>
              </>
            ) : (
              <span>No previous best</span>
            )}
          </div>
        </div>
        <button aria-label={`Remove ${ex?.name ?? "exercise"}`} onClick={() => removeExercise(exIdx)} className="p-1 text-muted hover:text-red-400"><Trash2 size={16} /></button>
      </div>
      <div className="grid grid-cols-[1.25rem_1fr_1fr_4.5rem_2.5rem_2rem] gap-1.5 px-1 pb-1 text-center text-[10px] uppercase tracking-wider text-muted">
        <span>#</span><span>Weight (lb)</span><span>Reps</span><span className="leading-tight">Rate of Perceived Exertion</span><span /><span />
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
