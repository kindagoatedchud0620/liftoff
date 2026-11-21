"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChartLine, Egg, Flame, House, Plus, Trophy, User, type LucideIcon } from "lucide-react";
import RestTimer from "@/components/tracker/RestTimer";
import { TierBadge } from "@/components/ui";
import { useRanks, useStreak } from "@/store/derived";
import { useStore } from "@/store/useStore";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

// Order is the mobile tab order: the Log button sits in the centre slot.
const NAV: NavItem[] = [
  { href: "/", label: "Home", short: "Home", icon: House },
  { href: "/gains", label: "Gains & Charts", short: "Gains", icon: ChartLine },
  { href: "/log", label: "Log Workout", short: "Log", icon: Plus },
  { href: "/quests", label: "Quests & Shop", short: "Quests", icon: Trophy },
  { href: "/profile", label: "Profile", short: "Profile", icon: User },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

function StreakChip() {
  const { count, alive, hoursLeft } = useStreak();
  const tone = !alive
    ? "border-line bg-card text-muted"
    : hoursLeft < 12
      ? "border-red-500/60 bg-red-500/15 text-red-400"
      : "border-line bg-card text-text";
  return (
    <div className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-bold tabular-nums ${tone}`} aria-label="Streak">
      <Flame className={`size-4 ${alive ? "text-orange-400" : "text-muted"}`} aria-hidden />
      <span>{count}</span>
      <span className="text-xs font-semibold text-muted">{alive ? `${Math.floor(hoursLeft)}h` : "broken"}</span>
    </div>
  );
}

function EggChip() {
  const eggs = useStore((s) => s.eggs);
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-sm font-bold tabular-nums" aria-label="Eggs">
      <Egg className="size-4 text-amber-300" aria-hidden />
      <span>{eggs.toLocaleString("en-US")}</span>
    </div>
  );
}

function ProfileBlock() {
  const profile = useStore((s) => s.profile);
  const { overall } = useRanks();
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="truncate text-sm font-semibold">{profile.name}</div>
      {profile.equippedTitle && <div className="truncate text-xs font-semibold text-accent">{profile.equippedTitle}</div>}
      <div className="mt-2 flex items-center gap-2">
        {overall ? (
          <>
            <TierBadge tier={overall.tier} />
            <span className="text-xs text-muted tabular-nums">{overall.score} / 1000</span>
          </>
        ) : (
          <span className="text-xs text-muted">Unranked</span>
        )}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const equipped = useStore((s) => s.profile.equippedTitle);
  const title = NAV.find((n) => isActive(pathname, n.href))?.label ?? "Liftoff";

  return (
    <div className="min-h-dvh bg-bg text-text">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-card-2 p-4 md:flex">
        <Link href="/" className="mb-6 px-2 text-2xl font-black tracking-[0.2em] text-accent">
          LIFTOFF
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active ? "bg-accent/15 text-accent ring-1 ring-accent/40" : "text-muted hover:bg-card hover:text-text"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <ProfileBlock />
        </div>
      </aside>

      <div className="min-w-0 md:pl-60">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            <div className="min-w-0 flex-1 truncate text-base font-bold tracking-wide">{title}</div>
            <StreakChip />
            <EggChip />
            {equipped && <span className="hidden max-w-40 truncate text-sm font-semibold text-accent md:block">{equipped}</span>}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl min-w-0 p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">{children}</main>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card-2/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {NAV.map(({ href, short, icon: Icon }) => {
            const active = isActive(pathname, href);
            if (href === "/log") {
              return (
                <li key={href} className="flex justify-center">
                  <Link
                    href={href}
                    aria-label="Log workout"
                    className="-translate-y-4 flex size-14 items-center justify-center rounded-full bg-accent text-bg shadow-lg shadow-accent/30"
                  >
                    <Icon className="size-7" aria-hidden />
                  </Link>
                </li>
              );
            }
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-semibold ${active ? "text-accent" : "text-muted"}`}
                >
                  <Icon className="size-5" aria-hidden />
                  {short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <RestTimer />
    </div>
  );
}
