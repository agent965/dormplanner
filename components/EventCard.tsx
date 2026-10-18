"use client";

import Link from "next/link";
import {
  cn,
  dietaryTagLabel,
  formatEventTime,
  getInProgressRemaining,
} from "@/lib/utils";
import { dormName } from "@/lib/dorms";

export type EventCardProps = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  location?: string | null;
  dormSlug?: string | null;
  hostName?: string | null;
  rsvpYesCount: number;
  capacity?: number | null;
  tags?: string[] | null;
  canceled?: boolean | null;
  pinned?: boolean;
  onTogglePin?: (id: string) => void;
  nowMs?: number;
};

export function EventCard(e: EventCardProps) {
  const startsAtDate =
    typeof e.startsAt === "string" ? new Date(e.startsAt) : e.startsAt;
  const endsAtDate =
    e.endsAt == null
      ? null
      : typeof e.endsAt === "string"
        ? new Date(e.endsAt)
        : e.endsAt;

  const full = !e.canceled && e.capacity != null && e.rsvpYesCount >= e.capacity;
  const inProgressLeft = !e.canceled
    ? getInProgressRemaining(startsAtDate, endsAtDate, e.nowMs)
    : null;

  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-xs text-[color:var(--muted)]">
          {formatEventTime(startsAtDate)}
          {endsAtDate ? ` – ${formatEventTime(endsAtDate)}` : ""} ·{" "}
          {dormName(e.dormSlug)}
          {e.location ? ` · ${e.location}` : ""}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              "text-lg font-semibold",
              e.canceled && "text-[color:var(--muted)] line-through"
            )}
          >
            {e.title}
          </h3>
          {onTogglePinRender(e.id, !!e.pinned, e.onTogglePin)}
          {e.canceled ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-[color:var(--danger)] text-white">
              Canceled
            </span>
          ) : inProgressLeft ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[color:var(--success)] text-white">
              In Progress, {inProgressLeft} left
            </span>
          ) : null}
        </div>
        {e.tags && e.tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {e.tags.map((t) => (
              <span key={t} className={cn("tag", e.canceled && "opacity-60")}>
                {dietaryTagLabel(t)}
              </span>
            ))}
          </div>
        ) : null}
        {e.description ? (
          <p className="mt-1 text-sm text-[color:var(--muted)] line-clamp-2">
            {e.description}
          </p>
        ) : null}
      </div>
      <div className="text-right">
        <div className="text-xs text-[color:var(--muted)]">going</div>
        <div className="text-lg font-semibold">
          {e.rsvpYesCount}
          {e.capacity != null ? (
            <span className="text-sm font-normal text-[color:var(--muted)]">
              /{e.capacity}
            </span>
          ) : null}
        </div>
        {full ? (
          <div className="mt-1 text-[10px] uppercase tracking-wide text-[color:var(--danger)]">
            full
          </div>
        ) : null}
      </div>
    </div>
  );

  if (e.canceled) {
    return (
      <div
        aria-disabled="true"
        className="block rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-800/80 p-4 text-[color:var(--muted)] opacity-75 cursor-not-allowed select-none"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/events/${e.id}`}
      className="block rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 hover:border-[color:var(--husky-purple)] transition-colors"
    >
      {content}
    </Link>
  );
}

function onTogglePinRender(
  id: string,
  pinned: boolean,
  onTogglePin?: (id: string) => void
) {
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onTogglePin?.(id);
      }}
      aria-label={pinned ? "Unpin event" : "Pin event"}
      title={pinned ? "Unpin from Tracking" : "Pin to Tracking"}
      className="inline-flex items-center justify-center p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-transform active:scale-95 cursor-pointer"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={pinned ? "#dc2626" : "#ffffff"}
        stroke={pinned ? "#dc2626" : "#000000"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 17v5" />
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      </svg>
    </button>
  );
}
