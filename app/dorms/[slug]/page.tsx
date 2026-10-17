import { notFound } from "next/navigation";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, dorms, rsvps, users } from "@/lib/db/schema";
import { EventCard } from "@/components/EventCard";

export const dynamic = "force-dynamic";

export default async function DormFeed({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [dorm] = await db.select().from(dorms).where(eq(dorms.slug, slug));
  if (!dorm) notFound();

  const now = new Date();
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
    .where(and(gte(events.startsAt, now), eq(events.dormSlug, slug)))
    .orderBy(events.startsAt);

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-[color:var(--muted)]">{dorm.area}</div>
        <h1 className="text-xl font-semibold">{dorm.name}</h1>
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">No upcoming events in this dorm yet.</p>
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
    </div>
  );
}
