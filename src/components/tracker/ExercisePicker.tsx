"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { EXERCISES } from "@/data/exercises";
import { MUSCLE_LABELS, MUSCLES } from "@/lib/stats";
import type { Equipment, Muscle } from "@/lib/types";
import { useStore } from "@/store/useStore";

const EQUIP: Equipment[] = ["barbell", "dumbbell", "cable", "machine", "bodyweight"];

export default function ExercisePicker({ onClose }: { onClose: () => void }) {
  const addExercise = useStore((s) => s.addExercise);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equip, setEquip] = useState<Equipment | null>(null);

  const list = useMemo(
    () =>
      EXERCISES.filter(
        (e) =>
          e.name.toLowerCase().includes(q.trim().toLowerCase()) &&
          (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)) &&
          (!equip || e.equipment === equip),
      ),
    [q, muscle, equip],
  );
  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs capitalize ${on ? "border-accent text-accent" : "border-line text-muted"}`;
  const names = (ms: Muscle[]) => ms.map((m) => MUSCLE_LABELS[m]).join(", ");

  return (
    <div role="dialog" aria-modal="true" aria-label="Add exercise" className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-bg md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line p-3">
          <Search size={16} className="text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" aria-label="Search exercises" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
          <button aria-label="Close" onClick={onClose} className="p-1 text-muted"><X size={18} /></button>
        </div>
        <div className="space-y-2 border-b border-line p-3">
          <div className="flex gap-1.5 overflow-x-auto">
            {EQUIP.map((e) => <button key={e} className={chip(equip === e)} onClick={() => setEquip(equip === e ? null : e)}>{e}</button>)}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {MUSCLES.map((m) => <button key={m} className={chip(muscle === m)} onClick={() => setMuscle(muscle === m ? null : m)}>{MUSCLE_LABELS[m]}</button>)}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {list.map((e) => (
            <li key={e.id}>
              <button onClick={() => { addExercise(e.id); onClose(); }} className="block w-full border-b border-line px-4 py-3 text-left hover:bg-card">
                <div className="font-semibold">{e.name} <span className="text-xs font-normal capitalize text-muted">{e.equipment}</span></div>
                <div className="text-xs text-muted">Primary: {names(e.primary)}{e.secondary.length ? ` | Secondary: ${names(e.secondary)}` : ""}</div>
              </button>
            </li>
          ))}
          {!list.length && <li className="p-6 text-center text-sm text-muted">No exercises match.</li>}
        </ul>
      </div>
    </div>
  );
}
