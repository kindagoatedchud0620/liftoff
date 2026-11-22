"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Dices, Pencil, X } from "lucide-react";
import { COMPANION_NAMES } from "@/lib/pet";
import { usePet } from "@/store/derived";
import { useStore } from "@/store/useStore";

const MAX = 24;

export function CompanionNameEditor({ size = "md", className = "" }: { size?: "md" | "lg"; className?: string }) {
  const { name } = usePet();
  const setCompanionName = useStore((s) => s.setCompanionName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  const start = () => {
    setDraft(name);
    setError(false);
    setSaved(false);
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const save = () => {
    if (!setCompanionName(draft)) return setError(true);
    setEditing(false);
    setSaved(true);
  };
  const randomize = () => {
    const i = COMPANION_NAMES.indexOf(draft.trim());
    const next = COMPANION_NAMES[(i + 1) % COMPANION_NAMES.length];
    setDraft(next === draft.trim() ? COMPANION_NAMES[(i + 2) % COMPANION_NAMES.length] : next);
    setError(false);
    inputRef.current?.focus();
  };

  const btn = "inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-card-2 px-3 text-sm font-medium";
  const nameCls = size === "lg" ? "text-3xl font-black" : "text-xl font-bold";

  if (!editing) {
    return (
      <div className={`flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
        <span className={`min-w-0 break-words ${nameCls}`} data-testid="companion-name">{name}</span>
        <button type="button" onClick={start} aria-label="Rename companion" data-testid="rename-companion" className={`${btn} text-accent`}>
          <Pencil size={14} aria-hidden="true" />
          Rename
        </button>
        {saved && <span role="status" className="text-xs font-bold text-accent">Saved</span>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(); }}
      onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
      className={`min-h-12 ${className}`}
    >
      <label htmlFor="companion-name-input" className="sr-only">Companion name</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="companion-name-input"
          ref={inputRef}
          data-testid="companion-name-input"
          aria-label="Companion name"
          value={draft}
          maxLength={MAX}
          autoFocus
          onChange={(e) => { setDraft(e.target.value); setError(false); }}
          aria-invalid={error}
          className="h-10 min-w-0 flex-1 basis-40 rounded-lg border border-line bg-card-2 px-3 text-base font-bold"
        />
        <button type="button" onClick={randomize} aria-label="Randomize Name" title="Randomize Name" data-testid="randomize-companion-name" className={`${btn} w-10 justify-center px-0`}>
          <Dices size={18} aria-hidden="true" />
        </button>
        <button type="submit" aria-label="Save companion name" data-testid="save-companion-name" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-bold text-black">
          <Check size={16} aria-hidden="true" />
          Save
        </button>
        <button type="button" onClick={cancel} aria-label="Cancel renaming" data-testid="cancel-companion-name" className={btn}>
          <X size={16} aria-hidden="true" />
          Cancel
        </button>
      </div>
      <div className="mt-1 flex justify-between gap-2 text-xs tabular-nums">
        <span role="alert" className="text-red-400">{error ? "Name must be 1 to 24 characters" : ""}</span>
        <span className="text-muted">{draft.length} / {MAX}</span>
      </div>
    </form>
  );
}

export default CompanionNameEditor;
