import type { TrophyState } from "@/lib/trophies";

export default function ProgressBar({ state }: { state: TrophyState }) {
  const { def, progress, fraction } = state;
  const pct = Math.round(fraction * 100);
  return (
    <div className="w-full">
      <div
        role="progressbar"
        aria-label={`${def.name} progress`}
        aria-valuemin={0}
        aria-valuemax={def.target}
        aria-valuenow={Math.min(Math.round(progress), def.target)}
        aria-valuetext={def.format(progress, def.target)}
        className="h-2 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: def.color }} />
      </div>
      <div className="mt-1 text-xs text-muted tabular-nums">{def.format(progress, def.target)}</div>
    </div>
  );
}
