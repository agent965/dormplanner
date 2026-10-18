import Link from "next/link";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cleanupExpiredEvents, db } from "@/lib/db";
import { events, rsvps, users } from "@/lib/db/schema";
import { EventFeed } from "@/components/EventFeed";
import type { RsvpPerson } from "@/components/EventCard";
import { DormPicker } from "@/components/DormPicker";
import { dormName } from "@/lib/dorms";

export const dynamic = "force-dynamic";

export default async function Home() {
  await cleanupExpiredEvents();

  const session = await auth();
  const me = session?.user?.id
    ? (
        await db
          .select({ dormSlug: users.dormSlug, floor: users.floor, name: users.username })
          .from(users)
          .where(eq(users.id, session.user.id))
      )[0] ?? null
    : null;

  const notEnded = sql`COALESCE(${events.endsAt}, ${events.startsAt} + interval '2 hours') > now()`;
  // Signed-in with a dorm: show that dorm + open-to-all. Otherwise show everything.
  const whereClause = me?.dormSlug
    ? and(
        notEnded,
        or(eq(events.dormSlug, me.dormSlug), eq(events.openToAllDorms, true))
      )
    : notEnded;

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      location: events.location,
      dormSlug: events.dormSlug,
      capacity: events.capacity,
      tags: events.tags,
      canceled: events.canceled,
      hostName: users.username,
      rsvpYesCount: sql<number>`(
        select count(*)::int from ${rsvps}
        where ${rsvps.eventId} = ${events.id} and ${rsvps.status} = 'yes'
      )`.as("rsvp_yes_count"),
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(whereClause)
    .orderBy(events.canceled, events.startsAt, sql`lower(${events.title})`)
    .limit(50);

  const rsvpRows =
    rows.length > 0
      ? await db
          .select({
            eventId: rsvps.eventId,
            status: rsvps.status,
            username: users.username,
            guestName: rsvps.guestName,
          })
          .from(rsvps)
          .leftJoin(users, eq(rsvps.userId, users.id))
          .where(
            inArray(
              rsvps.eventId,
              rows.map((r) => r.id)
            )
          )
          .orderBy(rsvps.updatedAt)
      : [];

  const rsvpByEvent = new Map<
    string,
    { going: RsvpPerson[]; maybe: RsvpPerson[]; cantGo: RsvpPerson[] }
  >();
  for (const r of rsvpRows) {
    let bucket = rsvpByEvent.get(r.eventId);
    if (!bucket) {
      bucket = { going: [], maybe: [], cantGo: [] };
      rsvpByEvent.set(r.eventId, bucket);
    }
    const person: RsvpPerson = {
      name: r.username ?? r.guestName ?? "guest",
      username: r.username ?? null,
    };
    if (r.status === "yes") bucket.going.push(person);
    else if (r.status === "maybe") bucket.maybe.push(person);
    else if (r.status === "no") bucket.cantGo.push(person);
  }

  const serializedEvents = rows.map((e) => {
    const rsvpLists = rsvpByEvent.get(e.id);
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      startsAt: new Date(e.startsAt).toISOString(),
      endsAt: e.endsAt ? new Date(e.endsAt).toISOString() : null,
      location: e.location,
      dormSlug: e.dormSlug,
      hostName: e.hostName,
      rsvpYesCount: e.rsvpYesCount,
      capacity: e.capacity,
      tags: e.tags,
      canceled: e.canceled,
      goingList: rsvpLists?.going ?? [],
      maybeList: rsvpLists?.maybe ?? [],
      cantGoList: rsvpLists?.cantGo ?? [],
    };
  });

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

      <EventFeed events={serializedEvents} canCreate={!!me} />
    </div>
  );
}
