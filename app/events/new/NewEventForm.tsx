"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UW_DORMS } from "@/lib/dorms";

const EVENT_TEMPLATES = [
  { label: "Potluck", title: "Floor potluck", desc: "Everyone brings something. Add what you're bringing to the list." },
  { label: "Pizza party", title: "Pizza night", desc: "Pies incoming. Chip in on the list." },
  { label: "Study break", title: "Study break", desc: "20 min break with snacks. Finals mode activated." },
  { label: "Cooking night", title: "Cooking night", desc: "We cook, you bring ingredients. See bring-list." },
  { label: "Movie night", title: "Movie night", desc: "Pick a movie + snacks on the list." },
  { label: "Grocery run", title: "Trader Joe's run", desc: "Going to TJ's — drop what you need in the list." },
] as const;

function roundToNextHour(d: Date) {
  const r = new Date(d);
  r.setHours(r.getHours() + 1, 0, 0, 0);
  return r;
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewEventForm({ defaultDormSlug }: { defaultDormSlug: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dormSlug, setDormSlug] = useState(defaultDormSlug);
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalInput(roundToNextHour(new Date())));
  const [capacity, setCapacity] = useState("");
  const [openToAll, setOpenToAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiet-hours warning if end time (default +2h) crosses 10pm on a weeknight
  const start = new Date(startsAt);
  const endGuess = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const weeknight = start.getDay() >= 0 && start.getDay() <= 4; // Sun–Thu
  const quietWarning =
    !isNaN(start.getTime()) && weeknight && endGuess.getHours() >= 22;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          dormSlug: dormSlug || undefined,
          location: location || undefined,
          startsAt: new Date(startsAt).toISOString(),
          capacity: capacity ? parseInt(capacity) : undefined,
          openToAllDorms: openToAll,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data?.error ? "Please fill the required fields." : "Something went wrong.");
        setSubmitting(false);
        return;
      }
      const { id } = await r.json();
      router.push(`/events/${id}`);
    } catch (err) {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="flex flex-wrap gap-2">
        {EVENT_TEMPLATES.map((t) => (
          <button
            type="button"
            key={t.label}
            onClick={() => {
              if (!title) setTitle(t.title);
              if (!description) setDescription(t.desc);
            }}
            className="text-xs px-2 py-1 rounded-full border border-[color:var(--border)] hover:border-[color:var(--husky-purple)]"
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-xs text-[color:var(--muted)]">Title *</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. 4F pizza party"
          className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs text-[color:var(--muted)]">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What's the vibe? When should people show up?"
          className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-[color:var(--muted)]">Dorm</span>
          <select
            value={dormSlug}
            onChange={(e) => setDormSlug(e.target.value)}
            className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm text-[color:var(--foreground)]"
          >
            <option value="">— none —</option>
            {UW_DORMS.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[color:var(--muted)]">Room / lounge</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            placeholder="e.g. 4F lounge"
            className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-[color:var(--muted)]">Start *</span>
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[color:var(--muted)]">Capacity</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="e.g. 20"
            className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={openToAll}
          onChange={(e) => setOpenToAll(e.target.checked)}
        />
        Open to all dorms (otherwise visible only to your dorm)
      </label>

      {quietWarning ? (
        <div className="text-xs rounded-md border border-[color:var(--husky-gold)] bg-[color:var(--husky-gold)]/10 px-3 py-2">
          Heads up: this runs past 10pm on a weeknight. Dorm quiet hours start at 10pm Sun–Thu — maybe move it earlier or dial down the volume.
        </div>
      ) : null}

      {error ? <div className="text-sm text-[color:var(--danger)]">{error}</div> : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="px-4 py-2 text-sm font-medium rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create event"}
        </button>
      </div>
    </form>
  );
}
