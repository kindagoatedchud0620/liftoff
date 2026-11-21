"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/store/useStore";

/** Renders children only after the persisted store has loaded, seeding sample data on first visit. */
export default function HydrationGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const done = () => {
      if (!useStore.getState().seeded) useStore.getState().seed();
      setReady(true);
    };
    if (useStore.persist.hasHydrated()) done();
    else return useStore.persist.onFinishHydration(done);
  }, []);
  if (!ready)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm uppercase tracking-[0.3em] text-muted">Loading HUD</div>
    );
  return <>{children}</>;
}
