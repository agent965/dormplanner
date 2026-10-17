import Link from "next/link";
import { formatEventTime } from "@/lib/utils";
import { dormName } from "@/lib/dorms";

type EventCardProps = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  location?: string | null;
  dormSlug?: string | null;
  hostName?: string | null;
  rsvpYesCount: number;
  capacity?: number | null;
};

export function EventCard(e: EventCardProps) {
  const full = e.capacity != null && e.rsvpYesCount >= e.capacity;
  return (
    <Link
      href={`/events/${e.id}`}
      className="block rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 hover:border-[color:var(--husky-purple)] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[color:var(--muted)]">
            {formatEventTime(e.startsAt)} · {dormName(e.dormSlug)}
            {e.location ? ` · ${e.location}` : ""}
          </div>
          <h3 className="mt-1 text-lg font-semibold">{e.title}</h3>
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
    </Link>
  );
}
