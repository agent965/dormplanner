"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  quantity: number;
  note: string | null;
  approved: boolean;
  createdByName: string;
  createdById: string | null;
  createdByGuestId: string | null;
  claimedByName: string | null;
  claimedById: string | null;
  claimedByGuestId: string | null;
  updatedAt: string;
};

type Props = {
  eventId: string;
  actorKind: "user" | "guest";
  userId: string | null;
  guestId: string | null;
  initialGuestName: string | null;
  isHost: boolean;
};

export function BringList({
  eventId,
  actorKind,
  userId,
  guestId,
  initialGuestName,
  isHost,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const needsName = actorKind === "guest" && !initialGuestName;

  const minesClaim = (row: {
    claimedById: string | null;
    claimedByGuestId: string | null;
  }) => {
    if (actorKind === "user") {
      return !!userId && row.claimedById === userId;
    }
    // Guests without a cookie yet have guestId=null; don't let that match
    // other null values (items claimed by signed-in users).
    return !!guestId && row.claimedByGuestId === guestId;
  };

  async function refresh() {
    try {
      const r = await fetch(`/api/events/${eventId}/items`, { cache: "no-store" });
      if (!r.ok) return;
      const { items } = await r.json();
      if (!mounted.current) return;
      setItems(items);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    refresh();
    const interval = setInterval(refresh, 2500);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (needsName) {
      setError("Set your name above first.");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const r = await fetch(`/api/events/${eventId}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), quantity: qty }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(
          data?.error === "name_required"
            ? "Set your name above first."
            : "Could not add item."
        );
        return;
      }
      setName("");
      setQty(1);
      refresh();
    } finally {
      setAdding(false);
    }
  }

  async function patch(itemId: string, body: object) {
    if (needsName) {
      setError("Set your name above first.");
      return;
    }
    const r = await fetch(`/api/events/${eventId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      if (data?.error === "name_required") {
        setError("Set your name above first.");
      }
    }
    refresh();
  }

  const approved = items.filter((i) => i.approved);
  const pending = items.filter((i) => !i.approved);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {loading ? (
          <li className="text-sm text-[color:var(--muted)]">Loading list…</li>
        ) : approved.length === 0 && pending.length === 0 ? (
          <li className="text-sm text-[color:var(--muted)]">
            No items yet. Add the first thing to bring.
          </li>
        ) : (
          approved.map((item) => {
            const myClaim = minesClaim(item);
            const claimed = !!(item.claimedById || item.claimedByGuestId);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3",
                  claimed && "opacity-80"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        claimed && "line-through decoration-[color:var(--husky-purple)]/50"
                      )}
                    >
                      {item.name}
                    </span>
                    {item.quantity > 1 ? (
                      <span className="text-xs text-[color:var(--muted)]">×{item.quantity}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {claimed ? (
                      myClaim ? (
                        "You've got this"
                      ) : (
                        <>
                          {item.claimedById && item.claimedByName ? (
                            <Link
                              href={`/users/${encodeURIComponent(item.claimedByName)}`}
                              className="underline hover:text-[color:var(--husky-purple)]"
                            >
                              {item.claimedByName}
                            </Link>
                          ) : (
                            item.claimedByName
                          )}{" "}
                          has this
                        </>
                      )
                    ) : (
                      <>
                        Added by{" "}
                        {item.createdById ? (
                          <Link
                            href={`/users/${encodeURIComponent(item.createdByName)}`}
                            className="underline hover:text-[color:var(--husky-purple)]"
                          >
                            {item.createdByName}
                          </Link>
                        ) : (
                          item.createdByName
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {claimed ? (
                    myClaim || isHost ? (
                      <button
                        onClick={() => patch(item.id, { action: "unclaim" })}
                        className="text-xs px-2 py-1 rounded border border-[color:var(--border)] hover:border-[color:var(--husky-purple)]"
                      >
                        Unclaim
                      </button>
                    ) : null
                  ) : (
                    <button
                      onClick={() => patch(item.id, { action: "claim" })}
                      className="group inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:-translate-y-px active:translate-y-px active:shadow-[0_0_0_rgba(0,0,0,0.25)] transition-all whitespace-nowrap"
                    >
                      I&apos;ll bring it
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  {isHost ? (
                    <button
                      onClick={() => {
                        if (confirm(`Remove "${item.name}"?`)) patch(item.id, { action: "delete" });
                      }}
                      className="text-xs text-[color:var(--muted)] hover:text-[color:var(--danger)]"
                      title="Delete (host)"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Pending suggestions: host-only view */}
      {isHost && pending.length > 0 ? (
        <div className="pt-2 space-y-2">
          <div className="text-xs uppercase tracking-wide text-[color:var(--muted)] flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--husky-gold)]" />
            Suggested by guests · needs your OK
          </div>
          <ul className="space-y-2">
            {pending.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-[color:var(--husky-gold)] bg-[color:var(--husky-gold)]/5 p-3 opacity-80"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium italic">{item.name}</span>
                    {item.quantity > 1 ? (
                      <span className="text-xs text-[color:var(--muted)]">×{item.quantity}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    Suggested by{" "}
                    {item.createdById ? (
                      <Link
                        href={`/users/${encodeURIComponent(item.createdByName)}`}
                        className="underline hover:text-[color:var(--husky-purple)]"
                      >
                        {item.createdByName}
                      </Link>
                    ) : (
                      item.createdByName
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => patch(item.id, { action: "approve" })}
                    className="text-xs px-2 py-1 rounded bg-[color:var(--husky-purple)] text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Reject "${item.name}"?`)) patch(item.id, { action: "delete" });
                    }}
                    className="text-xs text-[color:var(--muted)] hover:text-[color:var(--danger)]"
                    title="Reject"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        onSubmit={addItem}
        className="rounded-lg border border-dashed border-[color:var(--border)] p-3 space-y-2"
      >
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isHost ? "Add an item…" : "Suggest an item…"}
            className="flex-1 bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
            maxLength={80}
          />
          <input
            type="number"
            min={1}
            max={99}
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value) || 1)}
            className="w-16 bg-transparent border border-[color:var(--border)] rounded-md px-2 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="px-3 py-2 text-sm font-medium rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] disabled:opacity-50"
          >
            {isHost ? "Add" : "Suggest"}
          </button>
        </div>
        {!isHost ? (
          <p className="text-[10px] text-[color:var(--muted)]">
            Your suggestion goes to the host for approval before appearing on the list.
          </p>
        ) : null}
        {error ? <p className="text-xs text-[color:var(--danger)]">{error}</p> : null}
      </form>
    </div>
  );
}
