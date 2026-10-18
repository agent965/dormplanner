import { notFound } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cleanupExpiredEvents, db, ensureEventRoleColumns } from "@/lib/db";
import { events, dorms, rsvps, users } from "@/lib/db/schema";
import { EventFeed } from "@/components/EventFeed";
import type { RsvpPerson } from "@/components/EventCard";
import { getFriendIds, visibleEventsCondition } from "@/lib/friends";

export const dynamic = "force-dynamic";

export default async function DormFeed({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await Promise.all([cleanupExpiredEvents(), ensureEventRoleColumns()]);

  const { slug } = await params;
  const [dorm] = await db.select().from(dorms).where(eq(dorms.slug, slug));
  if (!dorm) notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const friendIds = await getFriendIds(viewerId);

  const notEnded = sql`COALESCE(${events.endsAt}, ${events.startsAt} + interval '2 hours') > now()`;
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
    .where(
      and(
        notEnded,
        eq(events.dormSlug, slug),
        visibleEventsCondition(viewerId, friendIds)
      )
    )
    .orderBy(events.canceled, events.startsAt, sql`lower(${events.title})`);

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
    <div className="space-y-4">
      <header>
        <div className="text-xs text-[color:var(--muted)]">{dorm.area}</div>
        <h1 className="text-xl font-semibold">{dorm.name}</h1>
      </header>
      <EventFeed events={serializedEvents} />
    </div>
  );
}
