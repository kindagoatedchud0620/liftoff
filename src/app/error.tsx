"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const wipe = () => {
    if (!confirm("Delete all saved Liftoff data on this device and start fresh?")) return;
    localStorage.removeItem("liftoff-store");
    location.reload();
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-bold">Something went wrong</h1>
      <p className="text-sm text-muted">Your data is still saved. Try again first.</p>
      <button onClick={reset} className="h-11 w-full rounded-lg bg-accent font-bold text-black">Try again</button>
      <button onClick={wipe} className="text-xs text-muted underline">Reset saved data</button>
    </div>
  );
}
