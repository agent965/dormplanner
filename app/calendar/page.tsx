import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cleanupExpiredEvents, db, ensureEventRoleColumns } from "@/lib/db";
import { bringItems, events, rsvps } from "@/lib/db/schema";
import { EventCalendar, type CalendarEvent } from "@/components/EventCalendar";
import { getFriendIds, visibleEventsCondition } from "@/lib/friends";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await Promise.all([cleanupExpiredEvents(), ensureEventRoleColumns()]);
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const friendIds = await getFriendIds(viewerId);

  // Fetch a 4-month window around today (prev month → +3 months) so navigation
  // feels snappy without re-fetching. Can be widened later.
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 3, 1);

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      dormSlug: events.dormSlug,
      location: events.location,
      canceled: events.canceled,
      dishwasherClaimedById: events.dishwasherClaimedById,
      cookClaimedById: events.cookClaimedById,
    })
    .from(events)
    .where(
      and(
        gte(events.startsAt, windowStart),
        lt(events.startsAt, windowEnd),
        visibleEventsCondition(viewerId, friendIds)
      )
    )
    .orderBy(events.startsAt);

  const userRsvpdEventIds = new Set<string>();
  if (viewerId && rows.length > 0) {
    const eventIds = rows.map((r) => r.id);
    const rsvpRows = await db
      .select({
        eventId: rsvps.eventId,
        userId: rsvps.userId,
      })
      .from(rsvps)
      .where(
        and(
          inArray(rsvps.eventId, eventIds),
          eq(rsvps.userId, viewerId)
        )
      );

    for (const r of rsvpRows) {
      userRsvpdEventIds.add(r.eventId);
    }
    for (const r of rows) {
      if (
        (r.dishwasherClaimedById && r.dishwasherClaimedById === viewerId) ||
        (r.cookClaimedById && r.cookClaimedById === viewerId)
      ) {
        userRsvpdEventIds.add(r.id);
      }
    }

    const claimedItems = await db
      .select({ eventId: bringItems.eventId })
      .from(bringItems)
      .where(
        and(
          inArray(bringItems.eventId, eventIds),
          eq(bringItems.claimedById, viewerId)
        )
      );
    for (const item of claimedItems) {
      userRsvpdEventIds.add(item.eventId);
    }
  }

  const serialized: CalendarEvent[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: new Date(e.startsAt).toISOString(),
    endsAt: e.endsAt ? new Date(e.endsAt).toISOString() : null,
    dormSlug: e.dormSlug,
    location: e.location,
    canceled: e.canceled,
    isUserRsvpd: userRsvpdEventIds.has(e.id),
  }));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="display text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Dots mark days with events. Tap a day to see what&apos;s cooking.
        </p>
      </header>
      <EventCalendar events={serialized} />
    </div>
  );
}
