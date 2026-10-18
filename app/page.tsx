import Link from "next/link";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cleanupExpiredEvents, db } from "@/lib/db";
import { events, rsvps, users } from "@/lib/db/schema";
import { EventFeed } from "@/components/EventFeed";
import type { RsvpPerson } from "@/components/EventCard";
import { DormPicker } from "@/components/DormPicker";
import { dormName } from "@/lib/dorms";
import {
  PizzaSlice,
  Bowl,
  Cookie,
  Mug,
  Pot,
  Carrot,
  Cupcake,
  Bread,
} from "@/components/FoodArt";

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
      <section className="relative overflow-hidden card p-5 sm:p-6">
        {/* Scattered food doodles behind the hero */}
        <div className="doodles" aria-hidden>
          <PizzaSlice size={64} style={{ top: "-10px", left: "-6px", transform: "rotate(-18deg)" }} />
          <Bowl size={56} style={{ top: "40%", right: "-10px", transform: "rotate(8deg)" }} />
          <Cookie size={44} style={{ bottom: "-8px", left: "22%", transform: "rotate(-10deg)" }} />
          <Mug size={48} style={{ top: "8px", right: "28%", transform: "rotate(14deg)" }} />
          <Pot size={60} style={{ bottom: "-14px", right: "20%", transform: "rotate(-6deg)" }} />
          <Carrot size={44} style={{ top: "48%", left: "32%", transform: "rotate(22deg)" }} />
          <Cupcake size={40} style={{ top: "16%", left: "60%", transform: "rotate(-14deg)" }} />
          <Bread size={52} style={{ bottom: "22%", left: "-10px", transform: "rotate(10deg)" }} />
        </div>

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold display">
              {me ? (
                <>Hey {me.name?.split(" ")[0] ?? "there"}, hungry?</>
              ) : (
                <>What&apos;s cookin&apos; in the dorms?</>
              )}
            </h1>
            <p className="mt-1.5 text-sm text-[color:var(--muted)] max-w-md">
              {me ? (
                me.dormSlug ? (
                  <>
                    Showing events in <strong className="text-[color:var(--foreground)]">{dormName(me.dormSlug)}</strong>
                    {me.floor ? ` · floor ${me.floor}` : ""} plus anything open to all dorms.
                  </>
                ) : (
                  "Pick your dorm below to filter the feed."
                )
              ) : (
                <>Browse and RSVP freely — no account needed. Sign in with a username to host your own.</>
              )}
            </p>
          </div>
          <Link href={me ? "/events/new" : "/signin"} className="btn-primary text-sm whitespace-nowrap">
            {me ? "+ New event" : "Sign in to host"}
          </Link>
        </div>
        {me ? (
          <div className="relative mt-4 pt-4 border-t border-[color:var(--border)]">
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
