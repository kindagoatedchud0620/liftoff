import type { ReactNode } from "react";
import type { Rank, Tier } from "@/lib/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-card p-4 ${className}`}>{children}</section>;
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{children}</h2>
      {right}
    </div>
  );
}

/** Small pill showing a tier name in its color. Olympian gets the radiant glow. */
export function TierBadge({ tier, size = "sm" }: { tier: Tier; size?: "sm" | "lg" }) {
  const pad = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center rounded-md border font-bold uppercase tracking-wider ${pad} ${tier.index === 8 ? "olympian-glow" : ""}`}
      style={{ color: tier.color, borderColor: `${tier.color}66`, background: `${tier.color}1a` }}
    >
      {tier.name}
    </span>
  );
}

/** LP progress bar within the current tier. */
export function LpBar({ rank, showLabel = true }: { rank: Rank; showLabel?: boolean }) {
  return (
    <div className="w-full">
      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full transition-all" style={{ width: `${rank.lp}%`, background: rank.tier.color }} />
      </div>
      {showLabel && (
        <div className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
          <span>{rank.lp} LP</span>
          <span>{rank.score} / 1000</span>
        </div>
      )}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const fmtNum = (n: number) => n.toLocaleString("en-US");
