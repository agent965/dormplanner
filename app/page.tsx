import Link from "next/link";
import { and, eq, gte, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps, users } from "@/lib/db/schema";
import { EventCard } from "@/components/EventCard";
import { DormPicker } from "@/components/DormPicker";
import { dormName } from "@/lib/dorms";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const me = session?.user?.id
    ? (
        await db
          .select({ dormSlug: users.dormSlug, floor: users.floor, name: users.username })
          .from(users)
          .where(eq(users.id, session.user.id))
      )[0] ?? null
    : null;

  const now = new Date();
  // Signed-in with a dorm: show that dorm + open-to-all. Otherwise show everything.
  const whereClause = me?.dormSlug
    ? and(
        gte(events.startsAt, now),
        or(eq(events.dormSlug, me.dormSlug), eq(events.openToAllDorms, true))
      )
    : gte(events.startsAt, now);

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      location: events.location,
      dormSlug: events.dormSlug,
      capacity: events.capacity,
      hostName: users.username,
      rsvpYesCount: sql<number>`(
        select count(*)::int from ${rsvps}
        where ${rsvps.eventId} = ${events.id} and ${rsvps.status} = 'yes'
      )`.as("rsvp_yes_count"),
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(whereClause)
    .orderBy(events.startsAt)
    .limit(50);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">
              {me ? `Hey ${me.name?.split(" ")[0] ?? "there"} 👋` : "Dorm events at UW"}
            </h1>
            <p className="text-sm text-[color:var(--muted)]">
              {me ? (
                me.dormSlug ? (
                  <>
                    Showing events in <strong>{dormName(me.dormSlug)}</strong>
                    {me.floor ? ` · floor ${me.floor}` : ""} + anything open to all dorms.
                  </>
                ) : (
                  "Pick your dorm to filter the feed."
                )
              ) : (
                "Browse and RSVP freely. Sign in with @uw.edu to host your own event."
              )}
            </p>
          </div>
          {me ? (
            <Link
              href="/events/new"
              className="px-3 py-2 text-sm font-medium rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)]"
            >
              + New event
            </Link>
          ) : (
            <Link
              href="/signin"
              className="px-3 py-2 text-sm font-medium rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)]"
            >
              Sign in to host
            </Link>
          )}
        </div>
        {me ? (
          <div className="mt-3 pt-3 border-t border-[color:var(--border)]">
            <DormPicker
              currentDormSlug={me.dormSlug ?? null}
              currentFloor={me.floor ?? null}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Upcoming
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
            Nothing on the calendar yet.
            {me ? (
              <>
                {" "}
                <Link href="/events/new" className="text-[color:var(--husky-purple)] underline">
                  Start the first event.
                </Link>
              </>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((e) => (
              <li key={e.id}>
                <EventCard
                  id={e.id}
                  title={e.title}
                  description={e.description}
                  startsAt={new Date(e.startsAt)}
                  location={e.location}
                  dormSlug={e.dormSlug}
                  hostName={e.hostName}
                  rsvpYesCount={e.rsvpYesCount}
                  capacity={e.capacity}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
