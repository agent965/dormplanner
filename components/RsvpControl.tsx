"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

type Status = "yes" | "maybe" | "no";

export function RsvpControl({
  eventId,
  initial,
  full,
}: {
  eventId: string;
  initial: Status | null;
  full: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(initial);
  const [pending, startTransition] = useTransition();

  function set(next: Status) {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const r = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) {
        setStatus(previous);
        alert("Could not update RSVP.");
      }
    });
  }

  const btn = (s: Status, label: string, disabled = false) => (
    <button
      key={s}
      onClick={() => set(s)}
      disabled={disabled || pending}
      className={cn(
        "flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors",
        status === s
          ? "bg-[color:var(--accent)] text-[color:var(--accent-fg)] border-transparent"
          : "border-[color:var(--border)] hover:border-[color:var(--husky-purple)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex gap-2">
        {btn("yes", "Going", full && status !== "yes")}
        {btn("maybe", "Maybe")}
        {btn("no", "Can't")}
      </div>
      {full && status !== "yes" ? (
        <p className="mt-2 text-xs text-[color:var(--danger)]">Event is at capacity.</p>
      ) : null}
    </div>
  );
}
