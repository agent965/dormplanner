"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getFingerprint } from "@/lib/fingerprint";

type Status = "yes" | "maybe" | "no";

export function RsvpControl({
  eventId,
  initial,
  full,
  actorKind,
  initialGuestName,
}: {
  eventId: string;
  initial: Status | null;
  full: boolean;
  actorKind: "user" | "guest";
  initialGuestName: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function needsName() {
    return actorKind === "guest" && !initialGuestName;
  }

  function set(next: Status) {
    if (needsName()) {
      setError("Enter your name above before RSVPing.");
      return;
    }
    setError(null);
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const fingerprint = actorKind === "guest" ? await getFingerprint() : undefined;
      const r = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next, fingerprint }),
      });
      if (!r.ok) {
        setStatus(previous);
        const data = await r.json().catch(() => ({}));
        setError(
          data?.error === "name_required"
            ? "Please set your name above first."
            : data?.error === "already_rsvpd"
            ? "You've already RSVP'd on this device."
            : data?.error === "event_canceled"
            ? "This event was canceled."
            : "Could not update RSVP."
        );
        return;
      }
      router.refresh();
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
      {error ? <p className="mt-2 text-xs text-[color:var(--danger)]">{error}</p> : null}
    </div>
  );
}
