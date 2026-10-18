"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Ingredients",
  "Cookware/Utensils",
  "Food/Dishes",
  "Other",
] as const;

type BringCategory = (typeof CATEGORIES)[number];

type Item = {
  id: string;
  name: string;
  quantity: number;
  category?: BringCategory;
  absolutelyNecessary?: boolean;
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
  const [selectedCategory, setSelectedCategory] = useState<BringCategory | null>(null);
  const [absolutelyNecessary, setAbsolutelyNecessary] = useState(false);
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
    if (!selectedCategory) {
      setError("Please select one of the category tags.");
      return;
    }
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
        body: JSON.stringify({
          name: name.trim(),
          quantity: qty,
          category: selectedCategory,
          absolutelyNecessary: isHost ? absolutelyNecessary : false,
        }),
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
      setSelectedCategory(null);
      setAbsolutelyNecessary(false);
      await refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dormplanner:looking-for-sync"));
      }
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
    await refresh();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dormplanner:looking-for-sync"));
    }
  }

  // Sort items with "Absolutely Necessary" to the top of the list
  const sortedItems = [...items].sort((a, b) => {
    const aNec = a.absolutelyNecessary ? 1 : 0;
    const bNec = b.absolutelyNecessary ? 1 : 0;
    return bNec - aNec;
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {loading ? (
          <li className="text-sm text-[color:var(--muted)]">Loading list…</li>
        ) : sortedItems.length === 0 ? (
          <li className="text-sm text-[color:var(--muted)]">
            No items yet. Add the first thing to bring.
          </li>
        ) : (
          sortedItems.map((item) => {
            const myClaim = minesClaim(item);
            const claimed = !!(item.claimedById || item.claimedByGuestId);
            const categoryLabel = item.category || "Other";
            const isNecessary = Boolean(item.absolutelyNecessary);

            if (!item.approved) {
              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-gray-400 bg-gray-200/60 dark:bg-gray-800/40 p-3 text-gray-500 opacity-75"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.quantity > 1 ? (
                        <span className="text-xs text-[color:var(--muted)]">×{item.quantity}</span>
                      ) : null}
                      {isNecessary ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-600 text-white border border-red-600">
                          Absolutely Necessary
                        </span>
                      ) : null}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-400 bg-white/70 text-gray-600">
                        {categoryLabel}
                      </span>
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
                    <p className="mt-1 text-xs italic text-[color:var(--muted)]">
                      pending approval from host
                    </p>
                  </div>
                  {isHost ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => patch(item.id, { action: "approve" })}
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:-translate-y-px active:translate-y-px active:shadow-[0_0_0_rgba(0,0,0,0.25)] transition-all whitespace-nowrap"
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
                  ) : null}
                </li>
              );
            }

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
                    {isNecessary ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-600 text-white border border-red-600">
                        Absolutely Necessary
                      </span>
                    ) : null}
                    <span className="tag text-[11px]">
                      {categoryLabel}
                    </span>
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
                <div className="flex items-center gap-2 shrink-0">
                  {claimed ? (
                    myClaim || isHost ? (
                      <button
                        onClick={() => {
                          if (!myClaim && isHost) {
                            const who = item.claimedByName ?? "someone";
                            if (
                              !confirm(
                                `Are you sure? This will remove ${who}'s claim on "${item.name}".`
                              )
                            ) {
                              return;
                            }
                          }
                          patch(item.id, { action: "unclaim" });
                        }}
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:-translate-y-px active:translate-y-px active:shadow-[0_0_0_rgba(0,0,0,0.25)] transition-all whitespace-nowrap"
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

      <form
        onSubmit={addItem}
        className="rounded-lg border border-dashed border-[color:var(--border)] p-3 space-y-2.5"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {isHost ? (
            <button
              type="button"
              onClick={() => setAbsolutelyNecessary((v) => !v)}
              aria-pressed={absolutelyNecessary}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                absolutelyNecessary
                  ? "bg-red-600 text-white border-red-600 ring-2 ring-red-600/30"
                  : "bg-red-50 text-red-700 border-red-500 hover:bg-red-100"
              )}
            >
              Absolutely Necessary
            </button>
          ) : null}
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={active}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  active
                    ? "bg-[color:var(--husky-purple)] text-white border-[color:var(--husky-purple)]"
                    : "bg-[color:var(--surface)] text-[color:var(--foreground)] border-[color:var(--border)] hover:border-[color:var(--husky-purple)]"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

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
            disabled={adding || !name.trim() || !selectedCategory}
            className="px-3 py-2 text-sm font-medium rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] disabled:opacity-50"
          >
            {isHost ? "Add" : "Suggest"}
          </button>
        </div>
        {!isHost ? (
          <p className="text-[10px] text-[color:var(--muted)]">
            Select a category tag above. Your suggestion will require host approval before anyone can claim it.
          </p>
        ) : null}
        {error ? <p className="text-xs text-[color:var(--danger)]">{error}</p> : null}
      </form>
    </div>
  );
}

