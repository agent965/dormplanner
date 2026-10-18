import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { cleanupExpiredEvents, db } from "@/lib/db";
import { events, dorms, rsvps, users } from "@/lib/db/schema";
import { EventFeed } from "@/components/EventFeed";

export const dynamic = "force-dynamic";

export default async function DormFeed({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await cleanupExpiredEvents();

  const { slug } = await params;
  const [dorm] = await db.select().from(dorms).where(eq(dorms.slug, slug));
  if (!dorm) notFound();

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
      canceled: events.canceled,
      hostName: users.username,
      rsvpYesCount: sql<number>`(
        select count(*)::int from ${rsvps}
        where ${rsvps.eventId} = ${events.id} and ${rsvps.status} = 'yes'
      )`.as("rsvp_yes_count"),
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(and(notEnded, eq(events.dormSlug, slug)))
    .orderBy(events.canceled, events.startsAt, sql`lower(${events.title})`);

  const serializedEvents = rows.map((e) => ({
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
  }));

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
