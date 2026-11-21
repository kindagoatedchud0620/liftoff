"use client";

import { useNow } from "@/store/derived";

export const RANGES = ["1M", "3M", "6M", "1Y", "ALL"] as const;
export type Range = (typeof RANGES)[number];

const DAYS: Record<Range, number> = { "1M": 30, "3M": 91, "6M": 182, "1Y": 365, ALL: 0 };

/** Epoch ms cutoff for a range (0 = no cutoff). */
export function useCutoff(range: Range): number {
  const now = useNow();
  return DAYS[range] ? now - DAYS[range] * 86_400_000 : 0;
}

export const inRange = (iso: string, cutoff: number) => new Date(iso).getTime() >= cutoff;

export const GRID = "#1F2937";
export const TICK = { fill: "#9CA3AF", fontSize: 11 };
export const TOOLTIP = {
  contentStyle: { background: "#0F1522", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#9CA3AF" },
  itemStyle: { color: "#F3F4F6" },
};
export const ACCENT = "#38BDF8";
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
