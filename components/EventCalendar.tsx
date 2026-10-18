"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn, formatEventTime } from "@/lib/utils";
import { dormName } from "@/lib/dorms";

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string; // ISO
  endsAt: string | null;
  dormSlug: string | null;
  location: string | null;
  canceled: boolean;
};

type Props = { events: CalendarEvent[] };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export function EventCalendar({ events }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(() => new Date());
  const today = new Date();

  // Group events by local-day key
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const d = new Date(e.startsAt);
      const k = dayKey(d);
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return m;
  }, [events]);

  // Build 6 weeks × 7 days of cells starting from the Sunday on or before day 1
  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [cursor]);

  const selectedEvents = selected ? (byDay.get(dayKey(selected)) ?? []) : [];
  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="px-2 py-1 rounded-md text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--border)]/40"
            aria-label="Previous month"
          >
            ← prev
          </button>
          <div className="flex items-center gap-2">
            <h2 className="display text-lg font-semibold">{monthLabel}</h2>
            <button
              onClick={() => {
                setCursor(startOfMonth(new Date()));
                setSelected(new Date());
              }}
              className="text-xs px-2 py-0.5 rounded-full border border-[color:var(--border)] hover:border-[color:var(--husky-purple)] text-[color:var(--muted)] hover:text-[color:var(--husky-purple)]"
            >
              today
            </button>
          </div>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="px-2 py-1 rounded-md text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--border)]/40"
            aria-label="Next month"
          >
            next →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wide text-center mb-1">
          {DOW.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = selected && sameDay(d, selected);
            const dayEvents = byDay.get(dayKey(d)) ?? [];
            const liveCount = dayEvents.filter((e) => !e.canceled).length;
            return (
              <button
                key={i}
                onClick={() => setSelected(d)}
                className={cn(
                  "relative aspect-square rounded-lg text-sm transition-colors flex flex-col items-center justify-center",
                  inMonth
                    ? "text-[color:var(--foreground)]"
                    : "text-[color:var(--muted)]/40",
                  isSelected
                    ? "bg-[color:var(--husky-purple)] text-white"
                    : isToday
                      ? "ring-2 ring-[color:var(--crust)] bg-[color:var(--cream)]"
                      : "hover:bg-[color:var(--border)]/40",
                  liveCount > 0 && !isSelected && inMonth && "font-semibold"
                )}
              >
                <span>{d.getDate()}</span>
                {liveCount > 0 ? (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {Array.from({ length: Math.min(liveCount, 3) }).map((_, j) => (
                      <span
                        key={j}
                        className={cn(
                          "w-1 h-1 rounded-full",
                          isSelected ? "bg-white" : "bg-[color:var(--crust)]"
                        )}
                      />
                    ))}
                    {liveCount > 3 ? (
                      <span
                        className={cn(
                          "text-[8px] leading-none",
                          isSelected ? "text-white" : "text-[color:var(--crust)]"
                        )}
                      >
                        +
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="card p-4 sm:p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="display text-base font-semibold">
              {selected.toLocaleString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            <span className="text-xs text-[color:var(--muted)]">
              {selectedEvents.length === 0
                ? "nothing on the stove"
                : `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}
            </span>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">
              No events this day. Pick another or come back later.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className={cn(
                      "block rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 hover:border-[color:var(--husky-purple)] transition-colors",
                      e.canceled && "opacity-60"
                    )}
                  >
                    <div className="text-xs text-[color:var(--muted)]">
                      {formatEventTime(new Date(e.startsAt))} ·{" "}
                      {dormName(e.dormSlug)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 font-medium",
                        e.canceled && "line-through"
                      )}
                    >
                      {e.title}
                      {e.canceled ? (
                        <span className="ml-2 text-xs text-[color:var(--danger)]">
                          canceled
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
