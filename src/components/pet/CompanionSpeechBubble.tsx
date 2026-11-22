"use client";

import Link from "next/link";
import { useCompanionMood, usePet } from "@/store/derived";

/** Sleepy warning shown over the companion when the workout streak is close to breaking. */
export default function CompanionSpeechBubble({ className = "" }: { className?: string }) {
  const { tired, hoursLeft } = useCompanionMood();
  const { name } = usePet();
  if (!tired) return null;

  const hours = Math.max(1, Math.ceil(hoursLeft));
  return (
    <div data-testid="companion-speech" className={className}>
      <div className="relative rounded-xl border border-amber-400/70 bg-card px-3 py-2 text-sm shadow-lg">
        <p>
          {name} is getting sleepy! Log a workout within <span className="font-bold tabular-nums">{hours}</span> {hours === 1 ? "hour" : "hours"} to protect your streak.
        </p>
        <Link href="/log" className="mt-1 inline-block text-xs font-bold text-accent">
          Log Workout
        </Link>
        <span aria-hidden="true" className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-amber-400/70 bg-card" />
      </div>
    </div>
  );
}
