"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function GuestNameGate({
  initialName,
  actorKind,
}: {
  initialName: string | null;
  actorKind: "user" | "guest";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!initialName);
  const [name, setName] = useState(initialName ?? "");
  const [pending, startTransition] = useTransition();

  if (actorKind === "user") return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const r = await fetch("/api/guest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (r.ok) {
      setEditing(false);
      startTransition(() => router.refresh());
    }
  }

  if (!editing) {
    return (
      <div className="text-xs text-[color:var(--muted)] flex items-center gap-2">
        <span>
          You're RSVPing as <strong className="text-[color:var(--foreground)]">{initialName}</strong>
        </span>
        <button
          onClick={() => setEditing(true)}
          className="underline hover:text-[color:var(--foreground)]"
        >
          change
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={save}
      className="rounded-lg border border-[color:var(--husky-gold)] bg-[color:var(--husky-gold)]/10 p-3 space-y-2"
    >
      <label className="block text-sm font-medium">Your name</label>
      <p className="text-xs text-[color:var(--muted)]">
        So people know who's going and who's bringing what. No account needed.
      </p>
      <div className="flex gap-2">
        <input
          autoFocus
          required
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jason K."
          className="flex-1 bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="px-3 py-2 text-sm font-medium rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </form>
  );
}
