"use client";

import { useState } from "react";
import { MeasurementsChart } from "@/components/analytics/MeasurementsChart";
import RankBadge3D, { TIER_TITLES } from "@/components/ranks/RankBadge3D";
import { Card, CardTitle, LpBar } from "@/components/ui";
import { useRanks } from "@/store/derived";
import { useStore } from "@/store/useStore";
import { LIMITS } from "@/lib/ranking";

const FIELDS = [
  ["bodyweight", "Bodyweight (lb)"],
  ["bodyFat", "Body Fat Percentage"],
] as const;
type F = (typeof FIELDS)[number][0];

const input = "w-full rounded-md border border-line bg-card-2 px-3 py-2 text-base tabular-nums outline-none focus:border-accent";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function ProfilePage() {
  const { profile, measurements, updateProfile, addMeasurement } = useStore();
  const { overall } = useRanks();
  const latest = measurements[measurements.length - 1];
  const [bw, setBw] = useState(String(profile.bodyweight));
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<Record<F, string>>(() => ({
    bodyweight: String(latest?.bodyweight ?? profile.bodyweight),
    bodyFat: latest ? String(latest.bodyFat) : "",
  }));
  const [error, setError] = useState("");
  const [toast, setToast] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nums = FIELDS.map(([k]) => Number(form[k]));
    const [bodyweight, bodyFat] = nums;
    if (!date || !Number.isFinite(bodyweight) || !Number.isFinite(bodyFat)) {
      setError("Enter a date, bodyweight and body fat.");
      return;
    }
    if (bodyweight < LIMITS.minBodyweight || bodyweight > LIMITS.maxBodyweight) {
      setError(`Bodyweight must be ${LIMITS.minBodyweight} to ${LIMITS.maxBodyweight} lb.`);
      return;
    }
    if (bodyFat <= 0 || bodyFat > LIMITS.maxBodyFat) {
      setError(`Body fat must be above 0 and at most ${LIMITS.maxBodyFat}%.`);
      return;
    }
    setError("");
    setBw(String(bodyweight));
    addMeasurement({ date: new Date(`${date}T12:00:00`).toISOString(), bodyweight, bodyFat });
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const reset = () => {
    if (!confirm("Reset all demo data? This clears everything saved on this device.")) return;
    localStorage.removeItem("liftoff-store");
    location.reload();
  };

  const exportData = () => {
    const blob = new Blob([localStorage.getItem("liftoff-store") ?? "{}"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `liftoff-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm("Replace everything on this device with this backup?")) return;
    let ok = false;
    try {
      ok = useStore.getState().importData(JSON.parse(await file.text()));
    } catch {}
    if (ok) setBw(String(useStore.getState().profile.bodyweight));
    else alert("That file is not a Liftoff backup.");
  };

  const clearAll = () => {
    if (!confirm("Delete all demo workouts and measurements and start with an empty log?")) return;
    useStore.getState().clearData();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Profile</h1>

      <Card>
        <div className="flex items-center gap-4">
          {overall && <RankBadge3D tier={overall.tier} size={160} className="shrink-0 max-sm:w-[128px]!" />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold">{profile.name}</div>
            <div className="text-3xl font-black uppercase tracking-wide" style={{ color: overall?.tier.color }}>
              {overall ? overall.tier.name : "Unranked"}
            </div>
            {overall && (
              <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: overall.tier.color }}>
                {TIER_TITLES[overall.tier.name]}
              </div>
            )}
            <div className="mt-2 text-2xl font-bold tabular-nums">
              {overall?.score ?? 0}
              <span className="text-sm font-normal text-muted"> / 1000</span>
            </div>
            {overall && (
              <div className="mt-2">
                <LpBar rank={overall} />
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Athlete</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            Name
            <input className={`${input} mt-1`} value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
          </label>
          <div className="text-xs text-muted">
            Sex
            <div className="mt-1 grid grid-cols-2 gap-1">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateProfile({ sex: s })}
                  aria-pressed={profile.sex === s}
                  className={`rounded-md border px-3 py-2 text-sm capitalize ${profile.sex === s ? "border-accent bg-accent/15 text-accent" : "border-line text-muted"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="text-xs text-muted">
            Bodyweight (lb)
            <input
              type="number"
              inputMode="decimal"
              className={`${input} mt-1`}
              value={bw}
              onChange={(e) => {
                setBw(e.target.value);
                const n = Number(e.target.value);
                // Wait for a plausible value so typing "180" never ranks you at 1 or 18 lb on the way.
                if (n >= LIMITS.minBodyweight && n <= LIMITS.maxBodyweight) updateProfile({ bodyweight: n });
              }}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">Ranks rescale with your bodyweight and sex, so changes here update every tier.</p>
      </Card>

      <Card>
        <CardTitle>Log measurement</CardTitle>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="col-span-2 text-xs text-muted sm:col-span-3">
            Date
            <input type="date" className={`${input} mt-1`} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {FIELDS.map(([k, label]) => (
            <label key={k} className="text-xs text-muted">
              {label}
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                className={`${input} mt-1`}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <div className="col-span-2 flex items-center gap-3 sm:col-span-3">
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg">Save</button>
            {error && <span className="text-xs text-rose-400">{error}</span>}
          </div>
        </form>
        {toast && (
          <div role="status" className="pop-in fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-card-2 px-4 py-2 text-sm shadow-lg">
            Measurement saved
          </div>
        )}
      </Card>

      <MeasurementsChart range="all" />

      <Card>
        <CardTitle>Recent measurements</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums sm:text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="py-1 pr-3">Date</th>
                <th className="pr-3">Bodyweight</th>
                <th>Body Fat Percentage</th>
              </tr>
            </thead>
            <tbody>
              {[...measurements].slice(-8).reverse().map((m) => (
                <tr key={m.date} className="border-t border-line">
                  <td className="py-1 pr-3 whitespace-nowrap">{new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</td>
                  <td className="pr-3">{m.bodyweight}</td>
                  <td>{m.bodyFat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-x-4 text-center">
        <button onClick={exportData} className="text-xs text-muted underline">
          Export backup
        </button>
        <label className="cursor-pointer text-xs text-muted underline">
          Import backup
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void importData(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <button onClick={clearAll} className="text-xs text-muted underline">
          Clear demo data &amp; start fresh
        </button>
        <button onClick={reset} className="text-xs text-muted underline">
          Reset demo data
        </button>
      </div>
    </div>
  );
}
