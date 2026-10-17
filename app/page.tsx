import Link from "next/link";
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps, users } from "@/lib/db/schema";
import { EventCard } from "@/components/EventCard";
import { DormPicker } from "@/components/DormPicker";
import { dormName } from "@/lib/dorms";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [me] = await db
    .select({ dormSlug: users.dormSlug, floor: users.floor, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id));

  const now = new Date();
  const dormFilter = me?.dormSlug
    ? or(eq(events.dormSlug, me.dormSlug), eq(events.openToAllDorms, true))
    : eq(events.openToAllDorms, true);

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      location: events.location,
      dormSlug: events.dormSlug,
      capacity: events.capacity,
      hostName: users.name,
      rsvpYesCount: sql<number>`(
        select count(*)::int from ${rsvps}
        where ${rsvps.eventId} = ${events.id} and ${rsvps.status} = 'yes'
      )`.as("rsvp_yes_count"),
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(and(gte(events.startsAt, now), dormFilter))
    .orderBy(events.startsAt)
    .limit(50);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">
              Hey {me?.name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="text-sm text-[color:var(--muted)]">
              {me?.dormSlug ? (
                <>
                  Showing events in <strong>{dormName(me.dormSlug)}</strong>
                  {me.floor ? ` · floor ${me.floor}` : ""} + anything open to all dorms.
                </>
              ) : (
                "Pick your dorm to see events near you."
              )}
            </p>
          </div>
          <Link
            href="/events/new"
            className="px-3 py-2 text-sm font-medium rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)]"
          >
            + New event
          </Link>
        </div>
        <div className="mt-3 pt-3 border-t border-[color:var(--border)]">
          <DormPicker
            currentDormSlug={me?.dormSlug ?? null}
            currentFloor={me?.floor ?? null}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Upcoming
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
            Nothing on the calendar yet.{" "}
            <Link href="/events/new" className="text-[color:var(--husky-purple)] underline">
              Start the first event.
            </Link>
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
