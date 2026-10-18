import Link from "next/link";
import { dietaryTagLabel, formatEventTime } from "@/lib/utils";
import { dormName } from "@/lib/dorms";
import type { PlannedDish } from "@/lib/db/schema";
import { PlannedDishesList } from "./PlannedDishes";

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
  plannedDishes?: PlannedDish[] | null;
  rsvpYesCount: number;
  attendeeUsernames: string[];
  attendeeNames: string[];
  maybeUsernames?: string[];
  maybeNames?: string[];
};

export function PastEventCard({
  event: e,
  roleLabel,
}: {
  event: PastEventItem;
  roleLabel?: "Hosted" | "Attended" | null;
}) {
  const registeredSet = new Set([
    ...e.attendeeUsernames.map((u) => u.toLowerCase()),
    ...(e.maybeUsernames ?? []).map((u) => u.toLowerCase()),
  ]);
  const goingNames = e.attendeeNames ?? [];
  const maybeNames = e.maybeNames ?? [];
  const hasBubbles = goingNames.length > 0 || maybeNames.length > 0;

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
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
          {hasBubbles ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {goingNames.map((name, idx) => {
                const isRegistered = registeredSet.has(name.toLowerCase());
                const cls =
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#007FFF] text-white border border-[#007FFF]";
                return isRegistered ? (
                  <Link
                    key={`yes-${name}-${idx}`}
                    href={`/users/${encodeURIComponent(name)}`}
                    className={`${cls} hover:underline`}
                  >
                    {name}
                  </Link>
                ) : (
                  <span key={`yes-${name}-${idx}`} className={cls}>
                    {name}
                  </span>
                );
              })}
              {maybeNames.map((name, idx) => {
                const isRegistered = registeredSet.has(name.toLowerCase());
                const cls =
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F9E076] text-[#1a1a1a] border border-[#e5c858]";
                return isRegistered ? (
                  <Link
                    key={`maybe-${name}-${idx}`}
                    href={`/users/${encodeURIComponent(name)}`}
                    className={`${cls} hover:underline`}
                  >
                    {name}
                  </Link>
                ) : (
                  <span key={`maybe-${name}-${idx}`} className={cls}>
                    {name}
                  </span>
                );
              })}
            </div>
          ) : null}
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
          <PlannedDishesList dishes={e.plannedDishes} />
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
    </div>
  );
}

