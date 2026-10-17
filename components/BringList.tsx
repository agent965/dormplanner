"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DIETARY_TAGS = [
  { v: "vegetarian", label: "veg" },
  { v: "vegan", label: "vegan" },
  { v: "gluten_free", label: "GF" },
  { v: "dairy_free", label: "DF" },
  { v: "nut_free", label: "nut-free" },
  { v: "halal", label: "halal" },
  { v: "kosher", label: "kosher" },
  { v: "contains_pork", label: "⚠ pork" },
  { v: "contains_alcohol", label: "⚠ alcohol" },
] as const;

type Tag = (typeof DIETARY_TAGS)[number]["v"];

type Item = {
  id: string;
  name: string;
  quantity: number;
  tags: Tag[];
  note: string | null;
  claimedById: string | null;
  claimedByName: string | null;
  createdById: string;
  updatedAt: string;
};

export function BringList({
  eventId,
  currentUserId,
}: {
  eventId: string;
  currentUserId: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [tags, setTags] = useState<Tag[]>([]);
  const mounted = useRef(true);

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
    setAdding(true);
    try {
      await fetch(`/api/events/${eventId}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), quantity: qty, tags }),
      });
      setName("");
      setQty(1);
      setTags([]);
      refresh();
    } finally {
      setAdding(false);
    }
  }

  async function patch(itemId: string, body: object) {
    await fetch(`/api/events/${eventId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    refresh();
  }

  const toggleTag = (t: Tag) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {loading ? (
          <li className="text-sm text-[color:var(--muted)]">Loading list…</li>
        ) : items.length === 0 ? (
          <li className="text-sm text-[color:var(--muted)]">
            No items yet. Add the first thing to bring.
          </li>
        ) : (
          items.map((item) => {
            const mine = item.claimedById === currentUserId;
            const claimed = !!item.claimedById;
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
                    {item.tags.map((t) => (
                      <span key={t} className="tag">
                        {DIETARY_TAGS.find((d) => d.v === t)?.label ?? t}
                      </span>
                    ))}
                  </div>
                  {item.claimedByName ? (
                    <div className="mt-1 text-xs text-[color:var(--muted)]">
                      {mine ? "You've" : `${item.claimedByName} has`} got this
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {claimed ? (
                    mine ? (
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
                      className="text-xs px-2 py-1 rounded bg-[color:var(--accent)] text-[color:var(--accent-fg)]"
                    >
                      I'll bring it
                    </button>
                  )}
                  {item.createdById === currentUserId ? (
                    <button
                      onClick={() => {
                        if (confirm(`Remove "${item.name}"?`)) patch(item.id, { action: "delete" });
                      }}
                      className="text-xs text-[color:var(--muted)] hover:text-[color:var(--danger)]"
                      title="Delete (creator only)"
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
        className="rounded-lg border border-dashed border-[color:var(--border)] p-3 space-y-2"
      >
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 2L of coke"
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
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {DIETARY_TAGS.map((t) => (
            <button
              type="button"
              key={t.v}
              onClick={() => toggleTag(t.v)}
              className={cn(
                "text-[10px] px-2 py-1 rounded-full border",
                tags.includes(t.v)
                  ? "bg-[color:var(--husky-purple)] text-white border-transparent"
                  : "border-[color:var(--border)] text-[color:var(--muted)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
