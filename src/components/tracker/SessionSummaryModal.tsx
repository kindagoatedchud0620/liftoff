"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Copy, Download, Loader2 } from "lucide-react";
import type { FinishResult } from "@/store/useStore";
import { useStore } from "@/store/useStore";
import { usePet, useRanks } from "@/store/derived";
import { prFeed } from "@/lib/stats";
import { EXERCISE_MAP } from "@/data/exercises";
import { fmtNum } from "@/components/ui";
import { RankBadge } from "@/components/ranks/RankBadge";
import { RankBadge3D, TIER_TITLES } from "@/components/ranks/RankBadge3D";
import { BodygraphMini } from "@/components/Bodygraph";
import type { Muscle } from "@/lib/types";

declare global {
  interface Window { __lastSummaryPng?: string }
}

const frames = (n: number) => new Promise<void>((res) => { const step = (i: number) => (i <= 0 ? res() : requestAnimationFrame(() => step(i - 1))); step(n); });

export default function SessionSummaryModal({ result, onClose }: { result: FinishResult; onClose: () => void }) {
  const { workout } = result;
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  const { overall } = useRanks();
  const pet = usePet();
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [useSvgBadge, setUseSvgBadge] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const rows = workout.exercises.map((we) => {
      const ex = EXERCISE_MAP[we.exerciseId];
      const sets = we.sets.filter((s) => s.done && s.reps > 0);
      const best = sets.reduce<(typeof sets)[number] | null>((b, s) => (!b || s.weight * s.reps > b.weight * b.reps ? s : b), null);
      return { name: ex?.name ?? we.exerciseId, primary: ex?.primary ?? [], sets: sets.length, best, volume: sets.reduce((n, s) => n + s.weight * s.reps, 0) };
    }).filter((r) => r.sets > 0);
    return {
      rows,
      total: Math.round(rows.reduce((n, r) => n + r.volume, 0)),
      sets: rows.reduce((n, r) => n + r.sets, 0),
      muscles: [...new Set(rows.flatMap((r) => r.primary))] as Muscle[],
    };
  }, [workout]);

  const prs = useMemo(() => prFeed(workouts, profile).filter((p) => p.date === workout.date), [workouts, profile, workout.date]);
  const prLine = (p: (typeof prs)[number]) => `${EXERCISE_MAP[p.exerciseId]?.name ?? p.exerciseId}: ${p.kind === "e1rm" ? "One-Rep Max Record" : "Volume Record"} ${fmtNum(p.value)} lb (+${fmtNum(p.value - p.previous)} lb)`;

  const dateLabel = new Date(workout.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const duration = `${workout.durationMin ?? 0} min`;
  const levelUp = result.levelAfter > result.levelBefore;
  const tier = overall?.tier;

  const snap = (filter?: (n: HTMLElement) => boolean) => toPng(cardRef.current!, { pixelRatio: 2, cacheBust: true, backgroundColor: "#090D16", filter });

  const download = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const canvas = cardRef.current.querySelector("canvas");
      let url: string | null = null;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        try { url = await snap(); } catch { url = null; }
      }
      if (!url) {
        // Fallback: swap the WebGL badge for the vector badge so it never exports blank.
        setUseSvgBadge(true);
        await frames(2);
        url = await snap();
      }
      window.__lastSummaryPng = url;
      const a = document.createElement("a");
      a.href = url;
      const d = new Date(workout.date); // local date, matching the date printed on the card
      a.download = `liftoff-session-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setToast("Image saved");
    } catch {
      setToast("Could not create the image");
    } finally {
      setUseSvgBadge(false);
      setBusy(false);
    }
  };

  const copy = async () => {
    const lines = [
      workout.name,
      `${dateLabel} | ${duration}`,
      `Total Weight Lifted: ${fmtNum(stats.total)} lb`,
      `Sets Completed: ${stats.sets}`,
      "",
      ...stats.rows.map((r) => (r.best ? `${r.name}: ${fmtNum(r.best.weight)} lb x ${r.best.reps}` : r.name)),
      "",
      prs.length ? "New Personal Records:" : "No new Personal Records this time.",
      ...prs.map((p) => `- ${prLine(p)}`),
      ...result.newTrophies.map((t) => `Trophy Unlocked: ${t}`),
      "",
      tier && overall ? `Overall Rank: ${tier.name} (${TIER_TITLES[tier.name]}), Liftoff Score ${overall.score} / 1000` : "",
      `${pet.name} earned +${result.xp} Experience Points`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n").replace(/\n{3,}/g, "\n\n").trim());
      setToast("Copied to Clipboard");
    } catch {
      setToast("Could not copy to the clipboard");
    }
  };

  const label = "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#EAB308]";

  return (
    <div role="dialog" aria-modal="true" aria-label="Workout summary" data-testid="session-summary-modal" className="fixed inset-0 z-[55] overflow-y-auto bg-black/85">
      <div className="mx-auto flex min-h-full w-full flex-col items-center gap-4 p-4">
        <div
          ref={cardRef}
          data-testid="session-summary-card"
          className="w-[420px] max-w-full space-y-5 rounded-2xl border border-[#EAB308]/50 p-6 text-[#F3F4F6]"
          style={{ background: "linear-gradient(180deg, #090D16 0%, #111827 100%)" }}
        >
          <header>
            <div className="text-sm font-black tracking-[0.35em] text-[#FFD700]">LIFTOFF</div>
            <h2 className="mt-2 break-words text-2xl font-bold">{workout.name}</h2>
            <p className="text-xs text-[#9CA3AF] tabular-nums">{dateLabel} | {duration}</p>
          </header>

          <dl className="grid grid-cols-3 gap-2 text-center tabular-nums">
            {[["Total Weight Lifted", `${fmtNum(stats.total)} lb`], ["Sets Completed", String(stats.sets)], ["Exercises", String(stats.rows.length)]].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-[#EAB308]/25 bg-white/5 px-1 py-2">
                <dd className="text-base font-bold text-[#FFD700]">{v}</dd>
                <dt className="text-[10px] leading-tight text-[#9CA3AF]">{k}</dt>
              </div>
            ))}
          </dl>

          <section className="text-center">
            <div className="flex justify-center">
              <BodygraphMini muscles={stats.muscles} color="#F59E0B" />
            </div>
            <p className={`${label} mt-1`}>Muscles Trained</p>
          </section>

          <section className="space-y-1.5">
            <h3 className={label}>New Personal Records</h3>
            {prs.length ? (
              <ul className="space-y-1.5 text-sm tabular-nums">
                {prs.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="min-w-0"><span className="font-semibold">{EXERCISE_MAP[p.exerciseId]?.name ?? p.exerciseId}</span><br /><span className="text-xs text-[#9CA3AF]">{p.kind === "e1rm" ? "One-Rep Max Record" : "Volume Record"}</span></span>
                    <span className="shrink-0 text-right font-bold text-[#FFD700]">{fmtNum(p.value)} lb<br /><span className="text-xs text-emerald-400">+{fmtNum(p.value - p.previous)} lb</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-[#9CA3AF]">No new Personal Records this time. Keep building.</p>}
            {result.newTrophies.map((t) => <p key={t} className="text-sm font-semibold text-[#FFD700]">Trophy Unlocked: {t}</p>)}
          </section>

          {tier && overall && (
            <section className="flex flex-col items-center text-center tabular-nums">
              <div style={{ width: 120, height: 120 }}>
                {useSvgBadge ? <RankBadge tier={tier} size={120} /> : <RankBadge3D tier={tier} size={120} interactive={false} preserveDrawingBuffer />}
              </div>
              <div className="mt-1 text-lg font-bold" style={{ color: tier.color }}>{tier.name}</div>
              <div className="text-xs text-[#9CA3AF]">{TIER_TITLES[tier.name]}</div>
              <div className="mt-1 text-sm">Liftoff Score {overall.score} / 1000</div>
            </section>
          )}

          <footer className="rounded-lg border border-[#EAB308]/25 bg-white/5 px-3 py-2 text-sm tabular-nums">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{pet.name}</span>
              <span className="text-[#9CA3AF]">Level {pet.level}</span>
              {levelUp && <span className="rounded bg-[#FFD700] px-1.5 py-0.5 text-xs font-bold text-black">Level up!</span>}
            </div>
            <div className="text-xs text-[#FFD700]">+{result.xp} Experience Points this session</div>
          </footer>
        </div>

        <div className="flex w-[420px] max-w-full flex-wrap gap-2">
          <button data-testid="download-summary" onClick={download} disabled={busy} className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-accent font-bold text-black disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}Download Image
          </button>
          <button data-testid="copy-summary" onClick={copy} className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-card font-semibold">
            <Copy size={16} />Copy Workout Summary
          </button>
          <button ref={closeRef} data-testid="close-summary" onClick={onClose} className="h-11 w-full rounded-lg border border-line text-sm font-semibold">Close</button>
        </div>
        <div aria-live="polite" className="h-6 text-sm font-semibold text-accent">{toast && <span data-testid="summary-toast">{toast}</span>}</div>
      </div>
    </div>
  );
}
