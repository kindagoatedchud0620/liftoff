"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import ProgressBar from "./ProgressBar";
import TrophyMedal from "./TrophyMedal";
import { useTrophies } from "./useTrophies";

const KEY = "liftoff-seen-trophies";
const WEEK = 7 * 86_400_000;
const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

function readSeen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function TrophyCase() {
  const states = useTrophies();
  const unlocked = states.filter((t) => t.unlocked);
  const locked = states.filter((t) => !t.unlocked);
  const [toasts, setToasts] = useState<string[]>([]);
  const [now] = useState(() => Date.now());

  const unlockedKey = unlocked.map((t) => t.def.id).join(",");
  useEffect(() => {
    const ids = unlockedKey ? unlockedKey.split(",") : [];
    const seen = readSeen();
    const fresh = ids.filter((id) => !seen.includes(id));
    if (!fresh.length) return;
    try {
      localStorage.setItem(KEY, JSON.stringify([...seen, ...fresh]));
    } catch {}
    const names = fresh.map((id) => states.find((t) => t.def.id === id)!.def.name);
    // Not cancelled on cleanup: strict mode reruns the effect after the seen set is already saved.
    setTimeout(() => setToasts(names), 0);
    setTimeout(() => setToasts([]), 6000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedKey]);

  const grid = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div data-testid="trophy-case" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-black tracking-wide">Trophy Case</h1>
        <span className="text-sm text-muted tabular-nums">
          {unlocked.length} of {states.length} unlocked
        </span>
      </div>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-center gap-2" role="status" aria-live="polite">
          {toasts.map((n) => (
            <div
              key={n}
              data-testid="trophy-unlock-toast"
              className="pointer-events-auto max-w-full rounded-xl border border-line bg-card-2 px-4 py-3 text-sm font-bold text-accent shadow-lg"
            >
              Trophy unlocked: {n}
            </div>
          ))}
        </div>
      )}

      <section aria-labelledby="tc-unlocked" className="flex flex-col gap-3">
        <h2 id="tc-unlocked" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Unlocked</h2>
        {unlocked.length ? (
          <div className={grid}>
            {unlocked.map((t) => (
              <Card key={t.def.id} className="flex items-start gap-3">
                <div data-testid={`trophy-${t.def.id}`} data-unlocked="true" className="contents">
                  <TrophyMedal state={t} size={80} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold" style={{ color: t.def.color }}>{t.def.name}</h3>
                      {t.unlockedAt && now - Date.parse(t.unlockedAt) <= WEEK && (
                        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-bg">New</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">{t.def.requirement}</p>
                    {t.unlockedAt && <p className="mt-2 text-xs tabular-nums">Unlocked {longDate(t.unlockedAt)}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nothing unlocked yet. Keep lifting.</p>
        )}
      </section>

      {locked.length > 0 && (
        <section aria-labelledby="tc-progress" className="flex flex-col gap-3">
          <h2 id="tc-progress" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">In progress</h2>
          <div className={grid}>
            {locked.map((t) => (
              <Card key={t.def.id}>
                <div data-testid={`trophy-${t.def.id}`} data-unlocked="false" className="flex items-start gap-3">
                  <TrophyMedal state={t} size={80} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold">{t.def.name}</h3>
                    <p className="mt-1 mb-3 text-xs text-muted">{t.def.requirement}</p>
                    <ProgressBar state={t} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
