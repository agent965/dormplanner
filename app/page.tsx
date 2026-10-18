import Link from "next/link";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cleanupExpiredEvents, db, ensureEventRoleColumns } from "@/lib/db";
import { events, rsvps, users } from "@/lib/db/schema";
import { EventFeed } from "@/components/EventFeed";
import type { RsvpPerson } from "@/components/EventCard";
import { DormPicker } from "@/components/DormPicker";
import { LandingHero } from "@/components/LandingHero";
import { dormName } from "@/lib/dorms";
import { getFriendIds, visibleEventsCondition } from "@/lib/friends";

export const dynamic = "force-dynamic";

export default async function Home() {
  await Promise.all([cleanupExpiredEvents(), ensureEventRoleColumns()]);

  const session = await auth();
  if (!session?.user?.id) {
    return <LandingHero />;
  }

  const me =
    (
      await db
        .select({ dormSlug: users.dormSlug, floor: users.floor, name: users.username })
        .from(users)
        .where(eq(users.id, session.user.id))
    )[0] ?? null;

  const notEnded = sql`COALESCE(${events.endsAt}, ${events.startsAt} + interval '2 hours') > now()`;
  // Friends-only events: visible only to the host and the host's friends
  // (regardless of dorm). Public events keep the existing dorm rules.
  const friendIds = await getFriendIds(session.user.id);
  const visible = visibleEventsCondition(session.user.id, friendIds);
  // Signed-in with a dorm: show that dorm + open-to-all. Otherwise show everything.
  const whereClause = me?.dormSlug
    ? and(
        notEnded,
        visible,
        or(
          eq(events.visibility, "friends"),
          eq(events.dormSlug, me.dormSlug),
          eq(events.openToAllDorms, true)
        )
      )
    : and(notEnded, visible);

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
      plannedDishes: events.plannedDishes,
      lookingForDishwasher: events.lookingForDishwasher,
      lookingForCook: events.lookingForCook,
      lookingForIngredients: events.lookingForIngredients,
      lookingForCookware: events.lookingForCookware,
      visibility: events.visibility,
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
      plannedDishes: e.plannedDishes ?? [],
      lookingForDishwasher: e.lookingForDishwasher,
      lookingForCook: e.lookingForCook,
      lookingForIngredients: e.lookingForIngredients,
      lookingForCookware: e.lookingForCookware,
      visibility: e.visibility,
      canceled: e.canceled,
      goingList: rsvpLists?.going ?? [],
      maybeList: rsvpLists?.maybe ?? [],
      cantGoList: rsvpLists?.cantGo ?? [],
    };
  });

  return (
    <div className="space-y-6">
      <section
        className="card p-5 sm:p-6"
        style={{
          borderWidth: 2,
          borderColor: "color-mix(in srgb, var(--crust) 30%, var(--border))",
          boxShadow:
            "0 2px 0 color-mix(in srgb, var(--crust) 40%, transparent), 0 10px 30px -8px color-mix(in srgb, var(--crust) 25%, transparent)",
        }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold display">
              Hey {me?.name?.split(" ")[0] ?? "there"}, hungry?
            </h1>
            <p className="mt-1.5 text-sm text-[color:var(--muted)] max-w-md">
              {me?.dormSlug ? (
                <>
                  Showing events in <strong className="text-[color:var(--foreground)]">{dormName(me.dormSlug)}</strong>
                  {me.floor ? ` · floor ${me.floor}` : ""} plus anything open to all dorms.
                </>
              ) : (
                "Pick your dorm below to filter the feed."
              )}
            </p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex items-center gap-1.5 text-base font-bold px-5 py-2.5 rounded-full bg-[color:var(--crust)] text-white uppercase tracking-wide shadow-[0_4px_0_rgba(0,0,0,0.35)] hover:shadow-[0_5px_0_rgba(0,0,0,0.35)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.35)] transition-all whitespace-nowrap"
          >
            <span className="text-xl leading-none">+</span>
            New event
          </Link>
        </div>
        <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
          <DormPicker
            currentDormSlug={me?.dormSlug ?? null}
            currentFloor={me?.floor ?? null}
          />
        </div>
      </section>

      <EventFeed events={serializedEvents} canCreate={!!me} />
    </div>
  );
}
