"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useStore, type FinishResult } from "@/store/useStore";
import { useNow } from "@/store/derived";
import { fmtDate, fmtNum } from "@/components/ui";
import ExerciseBlock from "./ExerciseBlock";
import ExercisePicker from "./ExercisePicker";
import RankUpModal from "@/components/ranks/RankUpModal";
import type { RankUpEvent } from "@/lib/types";

function Overlay({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[55] flex items-center justify-center bg-black/75 p-4">
      <div className="pop-in w-full max-w-sm rounded-2xl border border-line bg-card p-5">{children}</div>
    </div>
  );
}

export default function WorkoutLogger() {
  const router = useRouter();
  const active = useStore((s) => s.active);
  const workouts = useStore((s) => s.workouts);
  const startWorkout = useStore((s) => s.startWorkout);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const now = useNow(1000);
  const [picker, setPicker] = useState(false);
  const [queue, setQueue] = useState<RankUpEvent[]>([]);
  const [summary, setSummary] = useState<FinishResult | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const closeSummary = () => { setSummary(null); router.push("/"); };
  const summaryModal = summary && (
    <Overlay label="Workout complete">
      <h2 className="text-lg font-bold">Workout complete</h2>
      <dl className="my-4 space-y-2 text-sm tabular-nums">
        <div className="flex justify-between"><dt className="text-muted">Experience Points earned</dt><dd className="font-bold text-accent">+{summary.xp}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Personal Records</dt><dd>{summary.records}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Rank ups</dt><dd>{summary.rankUps}</dd></div>
        {summary.overallRankUp && <div className="flex justify-between"><dt className="text-muted">Overall Liftoff Rank up</dt><dd className="font-bold text-accent">Yes</dd></div>}
        <div className="flex justify-between gap-2"><dt className="text-muted">Companion level {summary.levelBefore} to {summary.levelAfter}</dt>{summary.levelAfter > summary.levelBefore && <dd className="font-bold text-accent">Level up!</dd>}</div>
      </dl>
      <button autoFocus onClick={closeSummary} className="h-11 w-full rounded-lg bg-accent font-bold text-black">Done</button>
    </Overlay>
  );

  if (!active) {
    const recent = [...workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return (
      <div className="mx-auto max-w-xl space-y-6 p-4">
        <button data-testid="start-workout" onClick={startWorkout} className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-accent text-lg font-bold text-black">
          <Plus size={22} />Log Workout
        </button>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recent workouts</h2>
          <ul className="space-y-2">
            {recent.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm">
                <div className="min-w-0"><div className="truncate font-semibold">{w.name}</div><div className="text-xs text-muted">{fmtDate(w.date)} | {w.exercises.length} exercises</div></div>
                <div className="shrink-0 text-xs text-muted tabular-nums">{fmtNum(Math.round(w.exercises.reduce((n, e) => n + e.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0)))} lb</div>
              </li>
            ))}
            {!recent.length && <li className="text-sm text-muted">No workouts yet.</li>}
          </ul>
        </div>
        {summaryModal}
      </div>
    );
  }

  const secs = Math.max(0, Math.floor((now - Date.parse(active.date)) / 1000));
  const elapsed = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const canFinish = active.exercises.some((e) => e.sets.some((s) => s.done && s.reps > 0));
  const rename = (name: string) => useStore.setState({ active: { ...active, name } });

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4 pb-40">
      <div className="flex items-center gap-3">
        <input aria-label="Workout name" value={active.name} onChange={(e) => rename(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent text-lg font-bold outline-none focus:border-line" />
        <span className="shrink-0 text-sm text-muted tabular-nums" aria-label="Elapsed time">{elapsed}</span>
      </div>
      {active.exercises.map((we, i) => <ExerciseBlock key={`${we.exerciseId}-${i}`} exIdx={i} we={we} onRankUp={(ev) => setQueue((q) => [...q, ...ev])} />)}
      <button data-testid="add-exercise" onClick={() => setPicker(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-card font-semibold hover:border-accent">
        <Plus size={18} />Add Exercise
      </button>
      <button data-testid="finish-workout" disabled={!canFinish} onClick={() => { const r = finishWorkout(); if (r) setSummary(r); }} className="h-12 w-full rounded-xl bg-accent font-bold text-black disabled:opacity-40">
        Finish Workout
      </button>
      <button onClick={() => setConfirmDiscard(true)} className="h-10 w-full text-sm text-red-400">Discard</button>

      {picker && <ExercisePicker onClose={() => setPicker(false)} />}
      <RankUpModal event={queue[0] ?? null} onClose={() => setQueue((q) => q.slice(1))} />
      {confirmDiscard && (
        <Overlay label="Discard workout">
          <p className="font-semibold">Discard this workout?</p>
          <p className="mt-1 text-sm text-muted">All logged sets will be lost.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setConfirmDiscard(false)} className="h-11 flex-1 rounded-lg border border-line">Keep</button>
            <button onClick={() => { discardWorkout(); setConfirmDiscard(false); }} className="h-11 flex-1 rounded-lg bg-red-500 font-bold text-white">Discard</button>
          </div>
        </Overlay>
      )}
      {summaryModal}
    </div>
  );
}
