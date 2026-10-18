"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UW_DORMS } from "@/lib/dorms";
import { cn, DIETARY_TAGS, type DietaryTagValue } from "@/lib/utils";
import type { PlannedDish } from "@/lib/db/schema";
import { PlannedDishesEditor, PlannedDishesList } from "@/components/PlannedDishes";

type EventData = {
  id: string;
  title: string;
  description: string | null;
  dormSlug: string | null;
  location: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity: number | null;
  tags: DietaryTagValue[];
  plannedDishes?: PlannedDish[];
  openToAllDorms: boolean;
  yesCount: number;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HostEventActions({ event }: { event: EventData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [dormSlug, setDormSlug] = useState(event.dormSlug ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(event.startsAt));
  const [endsAt, setEndsAt] = useState(
    event.endsAt ? toLocalInput(event.endsAt) : ""
  );
  const [capacity, setCapacity] = useState(
    event.capacity != null ? String(event.capacity) : ""
  );
  const [tags, setTags] = useState<DietaryTagValue[]>(event.tags ?? []);
  const [plannedDishes, setPlannedDishes] = useState<PlannedDish[]>(
    event.plannedDishes ?? []
  );
  const [openToAll, setOpenToAll] = useState(event.openToAllDorms);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (t: DietaryTagValue) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  function openEdit() {
    setTitle(event.title);
    setDescription(event.description ?? "");
    setDormSlug(event.dormSlug ?? "");
    setLocation(event.location ?? "");
    setStartsAt(toLocalInput(event.startsAt));
    setEndsAt(event.endsAt ? toLocalInput(event.endsAt) : "");
    setCapacity(event.capacity != null ? String(event.capacity) : "");
    setTags(event.tags ?? []);
    setPlannedDishes(event.plannedDishes ?? []);
    setOpenToAll(event.openToAllDorms);
    setCapacityError(null);
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setCapacityError(null);
    setError(null);

    const startDate = new Date(startsAt);
    if (endsAt) {
      const endDate = new Date(endsAt);
      if (isNaN(endDate.getTime()) || endDate <= startDate) {
        setError("End date/time must be after the start date/time. Changes were not saved.");
        return;
      }
    }

    const parsedCap = capacity.trim() === "" ? null : parseInt(capacity, 10);
    if (parsedCap != null && (isNaN(parsedCap) || parsedCap < 1)) {
      setCapacityError("Capacity must be at least 1. Changes were not saved.");
      return;
    }

    if (parsedCap != null && event.yesCount > parsedCap) {
      setCapacityError(
        `There are already ${event.yesCount} people going, which is more than the new capacity of ${parsedCap}. Changes were not saved.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          dormSlug: dormSlug || null,
          location: location || null,
          startsAt: startDate.toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          capacity: parsedCap,
          tags,
          plannedDishes,
          openToAllDorms: openToAll,
        }),
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data?.error === "capacity_exceeded") {
          setCapacityError(
            data.message ??
              `There are more people going than the new capacity allows. Changes were not saved.`
          );
        } else {
          setError("Could not save changes. Please check your inputs.");
        }
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Changes were not saved.");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        setError("Could not delete event.");
        setDeleting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error while deleting event.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-1">
        {!editing ? (
          <button
            type="button"
            onClick={openEdit}
            className="text-xs px-3 py-1.5 rounded-md border border-[color:var(--border)] hover:border-[color:var(--husky-purple)] font-medium transition-colors"
          >
            Edit event
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-3 py-1.5 rounded-md border border-[color:var(--danger)]/40 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10 font-medium transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete event"}
        </button>
      </div>

      {editing ? (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Edit event</h2>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setCapacityError(null);
                setError(null);
              }}
              className="text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            >
              Cancel
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-[color:var(--muted)]">Title *</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
            />
          </label>

          <div>
            <label className="block">
              <span className="text-xs text-[color:var(--muted)]">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
              />
            </label>
            <PlannedDishesList
              dishes={plannedDishes}
              onRemove={(idx) =>
                setPlannedDishes((prev) => prev.filter((_, i) => i !== idx))
              }
            />
          </div>

          <PlannedDishesEditor
            dishes={plannedDishes}
            onChange={setPlannedDishes}
          />

          <div>
            <span className="text-xs text-[color:var(--muted)]">Dietary tags</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DIETARY_TAGS.map((t) => (
                <button
                  type="button"
                  key={t.v}
                  onClick={() => toggleTag(t.v)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    tags.includes(t.v)
                      ? "bg-[color:var(--husky-purple)] text-white border-transparent"
                      : "border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color:var(--husky-purple)]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-[color:var(--muted)]">Dorm</span>
              <select
                value={dormSlug}
                onChange={(e) => setDormSlug(e.target.value)}
                className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm text-[color:var(--foreground)]"
              >
                <option value="">No dorm</option>
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

          <div className="grid grid-cols-2 gap-3 items-start">
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
              <span className="text-xs text-[color:var(--muted)]">End (defaults to +2 hrs)</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-[color:var(--muted)]">Capacity</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={capacity}
              onChange={(e) => {
                setCapacity(e.target.value);
                if (capacityError) setCapacityError(null);
              }}
              placeholder="e.g. 20"
              className={cn(
                "mt-1 w-full bg-transparent border rounded-md px-3 py-2 text-sm",
                capacityError
                  ? "border-[color:var(--danger)]"
                  : "border-[color:var(--border)]"
              )}
            />
            {capacityError ? (
              <p className="mt-1 text-xs text-[color:var(--danger)]">
                {capacityError}
              </p>
            ) : null}
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openToAll}
              onChange={(e) => setOpenToAll(e.target.checked)}
            />
            Open to all dorms (otherwise visible only to your dorm)
          </label>

          {error ? (
            <div className="text-sm text-[color:var(--danger)]">{error}</div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setCapacityError(null);
                setError(null);
              }}
              className="px-3 py-2 text-sm rounded-md border border-[color:var(--border)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      ) : null}

      {!editing && error ? (
        <p className="text-xs text-[color:var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}

