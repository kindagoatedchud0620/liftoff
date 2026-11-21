"use client";

import { Flame, Snowflake } from "lucide-react";
import { Card } from "@/components/ui";
import { SHOP, STREAK_WINDOW_H } from "@/lib/gamification";
import { useStore } from "@/store/useStore";
import { useNow, useStreak } from "@/store/derived";

const REVIVE = SHOP.find((i) => i.id === "streak-revive")!;

function ago(iso: string, now: number) {
  const h = Math.floor((now - Date.parse(iso)) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function StreakCard() {
  const s = useStreak();
  const now = useNow();
  const eggs = useStore((st) => st.eggs);
  const buy = useStore((st) => st.buy);
  const h = Math.floor(s.hoursLeft);
  const m = Math.floor((s.hoursLeft - h) * 60);
  const color = s.hoursLeft > 36 ? "#22c55e" : s.hoursLeft > 12 ? "#f59e0b" : "#ef4444";
  const frozen = !s.alive;
  const affordable = eggs >= REVIVE.price;

  return (
    <Card className={frozen ? "border-sky-400/40" : ""}>
      <div className="flex items-center gap-3">
        {frozen ? <Snowflake size={36} className="text-sky-300" aria-hidden /> : <Flame size={36} className="text-orange-500" aria-hidden />}
        <div className="min-w-0 flex-1">
          <div className={`text-3xl font-bold tabular-nums ${frozen ? "text-sky-300" : ""}`}>
            {s.count} <span className="text-sm font-medium text-muted">{frozen ? "streak frozen" : "day streak"}</span>
          </div>
          <div className="text-xs text-muted tabular-nums">Best {s.best} days{s.lastAt ? ` | Last workout ${ago(s.lastAt, now)}` : ""}</div>
        </div>
      </div>
      {s.alive ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Streak buffer" aria-valuemin={0} aria-valuemax={STREAK_WINDOW_H} aria-valuenow={Math.round(s.hoursLeft)}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(s.hoursLeft / STREAK_WINDOW_H) * 100}%`, background: color }} />
          </div>
          <div className="mt-1 text-xs tabular-nums" style={{ color }}>{h}h {String(m).padStart(2, "0")}m left</div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-sky-400/20" />
          {s.revivable ? (
            <button disabled={!affordable} onClick={() => buy("streak-revive")} className="mt-3 h-11 w-full rounded-lg bg-sky-400 font-bold text-black disabled:opacity-40">
              Revive streak ({REVIVE.price} Eggs)
            </button>
          ) : (
            <p className="mt-2 text-xs text-muted">Log a workout to start a new streak.</p>
          )}
          {s.revivable && !affordable && <p className="mt-1 text-xs text-muted tabular-nums">Need {REVIVE.price - eggs} more Eggs.</p>}
        </div>
      )}
    </Card>
  );
}
