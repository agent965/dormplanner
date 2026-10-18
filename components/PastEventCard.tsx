import Link from "next/link";
import { dietaryTagLabel, formatEventTime } from "@/lib/utils";
import { dormName } from "@/lib/dorms";

export type PastEventItem = {
  id: string;
  title: string;
  description: string | null;
  hostName: string;
  dormSlug: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  tags: string[];
  rsvpYesCount: number;
  attendeeUsernames: string[];
  attendeeNames: string[];
};

export function PastEventCard({
  event: e,
  roleLabel,
}: {
  event: PastEventItem;
  roleLabel?: "Hosted" | "Attended" | null;
}) {
  const registeredSet = new Set(e.attendeeUsernames.map((u) => u.toLowerCase()));

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-[color:var(--muted)]">
            {formatEventTime(e.startsAt)} – {formatEventTime(e.endsAt)} ·{" "}
            {dormName(e.dormSlug)}
            {e.location ? ` · ${e.location}` : ""}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{e.title}</h3>
            {roleLabel ? (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-[color:var(--border)] text-[color:var(--muted)]">
                {roleLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-[color:var(--muted)]">
            Hosted by{" "}
            <Link
              href={`/users/${encodeURIComponent(e.hostName)}`}
              className="underline hover:text-[color:var(--husky-purple)]"
            >
              {e.hostName}
            </Link>
          </div>
          {e.tags && e.tags.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {e.tags.map((t) => (
                <span key={t} className="tag">
                  {dietaryTagLabel(t)}
                </span>
              ))}
            </div>
          ) : null}
          {e.description ? (
            <p className="mt-1.5 text-sm text-[color:var(--muted)] whitespace-pre-wrap">
              {e.description}
            </p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-[color:var(--muted)]">attended</div>
          <div className="text-lg font-semibold">
            {e.rsvpYesCount}
            {e.capacity != null ? (
              <span className="text-sm font-normal text-[color:var(--muted)]">
                /{e.capacity}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {e.attendeeNames && e.attendeeNames.length > 0 ? (
        <div className="pt-2 border-t border-[color:var(--border)] text-xs text-[color:var(--muted)] flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Attendees:</span>
          {e.attendeeNames.map((name, idx) => {
            const isRegistered = registeredSet.has(name.toLowerCase());
            return (
              <span key={`${name}-${idx}`}>
                {isRegistered ? (
                  <Link
                    href={`/users/${encodeURIComponent(name)}`}
                    className="underline hover:text-[color:var(--husky-purple)]"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
                {idx < e.attendeeNames.length - 1 ? "," : ""}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

