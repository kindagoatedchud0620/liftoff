"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/store/useStore";

/** Renders children only after the persisted store has loaded, seeding sample data on first visit. */
export default function HydrationGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const done = () => {
      if (!useStore.getState().seeded) useStore.getState().seed();
      setReady(true);
    };
    // Corrupt saved data never finishes hydrating, so offer a reset instead of loading forever.
    const t = setTimeout(() => setStuck(true), 4000);
    const off = useStore.persist.hasHydrated() ? (done(), undefined) : useStore.persist.onFinishHydration(done);
    return () => { clearTimeout(t); off?.(); };
  }, []);
  if (!ready)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-sm uppercase tracking-[0.3em] text-muted">
        Loading HUD
        {stuck && (
          <button
            className="rounded-lg border border-line px-4 py-2 text-xs normal-case tracking-normal"
            onClick={() => { if (confirm("Saved data could not be read. Delete it and start fresh?")) { localStorage.removeItem("liftoff-store"); location.reload(); } }}
          >
            Reset saved data
          </button>
        )}
      </div>
    );
  return <>{children}</>;
}
