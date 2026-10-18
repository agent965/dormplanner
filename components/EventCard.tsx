import Link from "next/link";
import { cn, dietaryTagLabel, formatEventTime } from "@/lib/utils";
import { dormName } from "@/lib/dorms";

type EventCardProps = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  dormSlug?: string | null;
  hostName?: string | null;
  rsvpYesCount: number;
  capacity?: number | null;
  tags?: string[] | null;
  canceled?: boolean | null;
};

export function EventCard(e: EventCardProps) {
  const full = !e.canceled && e.capacity != null && e.rsvpYesCount >= e.capacity;
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-xs text-[color:var(--muted)]">
          {formatEventTime(e.startsAt)}
          {e.endsAt ? ` – ${formatEventTime(e.endsAt)}` : ""} · {dormName(e.dormSlug)}
          {e.location ? ` · ${e.location}` : ""}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <h3
            className={cn(
              "text-lg font-semibold",
              e.canceled && "text-[color:var(--muted)] line-through"
            )}
          >
            {e.title}
          </h3>
          {e.canceled ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-[color:var(--danger)] text-white">
              Canceled
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
