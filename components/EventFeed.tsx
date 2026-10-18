"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventCard, type EventCardProps } from "./EventCard";

const STORAGE_KEY = "dormplanner_tracked_events";

function compareEvents(a: EventCardProps, b: EventCardProps): number {
  const aCanceled = a.canceled ? 1 : 0;
  const bCanceled = b.canceled ? 1 : 0;
  if (aCanceled !== bCanceled) return aCanceled - bCanceled;

  const aStart = new Date(a.startsAt).getTime();
  const bStart = new Date(b.startsAt).getTime();
  if (aStart !== bStart) return aStart - bStart;

  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

export function EventFeed({
  events,
  canCreate = false,
}: {
  events: EventCardProps[];
  canCreate?: boolean;
}) {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPinnedIds(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  const pinnedSet = new Set(pinnedIds);
  const sorted = [...events].sort(compareEvents);
  const trackingEvents = sorted.filter((e) => pinnedSet.has(e.id));
  const upcomingEvents = sorted.filter((e) => !pinnedSet.has(e.id));

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Tracking
        </h2>
        {trackingEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
            No tracked events yet. Click the pin icon on an event to track it here.
          </div>
        ) : (
          <ul className="space-y-2">
            {trackingEvents.map((e) => (
              <li key={e.id}>
                <EventCard
                  {...e}
                  pinned={true}
                  onTogglePin={togglePin}
                  nowMs={nowMs}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Upcoming
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
            {events.length === 0 ? (
              <>
                Nothing on the calendar yet.
                {canCreate ? (
                  <>
                    {" "}
                    <Link
                      href="/events/new"
                      className="text-[color:var(--husky-purple)] underline"
                    >
                      Start the first event.
                    </Link>
                  </>
                ) : null}
              </>
            ) : (
              "All upcoming events are currently in your Tracking list."
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <EventCard
                  {...e}
                  pinned={false}
                  onTogglePin={togglePin}
                  nowMs={nowMs}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

