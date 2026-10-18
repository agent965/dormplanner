"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type EventVisibility = "public" | "friends";

const OPTIONS: Array<{ value: EventVisibility; label: string; hint: string }> = [
  { value: "public", label: "Public", hint: "Anyone who can see your dorm's feed" },
  { value: "friends", label: "Friends Only", hint: "Only you and your friends" },
];

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function VisibilitySelect({
  value,
  onChange,
}: {
  value: EventVisibility;
  onChange: (v: EventVisibility) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="block">
      <span className="text-xs text-[color:var(--muted)]">Who can see this event?</span>
      <div ref={rootRef} className="relative mt-1">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm bg-transparent transition-colors",
            open
              ? "border-[color:var(--husky-purple)] ring-2 ring-[color:var(--husky-purple)]/20"
              : "border-[color:var(--border)] hover:border-[color:var(--husky-purple)]"
          )}
        >
          <span className="inline-flex items-center gap-2">
            <span className="text-[color:var(--husky-purple)]">
              {current.value === "friends" ? <FriendsIcon /> : <GlobeIcon />}
            </span>
            <span className="font-medium">{current.label}</span>
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "text-[color:var(--muted)] transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open ? (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] shadow-lg"
          >
            {OPTIONS.map((o) => {
              const selected = o.value === value;
              return (
                <li key={o.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                      selected
                        ? "bg-[color:var(--husky-purple)] text-white"
                        : "hover:bg-[color:var(--husky-purple)]/10"
                    )}
                  >
                    <span className={selected ? "text-white" : "text-[color:var(--husky-purple)]"}>
                      {o.value === "friends" ? <FriendsIcon /> : <GlobeIcon />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{o.label}</span>
                      <span
                        className={cn(
                          "block text-xs",
                          selected ? "text-white/80" : "text-[color:var(--muted)]"
                        )}
                      >
                        {o.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

