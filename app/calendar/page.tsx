import { and, gte, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, ensureEventRoleColumns } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { EventCalendar, type CalendarEvent } from "@/components/EventCalendar";
import { getFriendIds, visibleEventsCondition } from "@/lib/friends";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await ensureEventRoleColumns();
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

  const serialized: CalendarEvent[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: new Date(e.startsAt).toISOString(),
    endsAt: e.endsAt ? new Date(e.endsAt).toISOString() : null,
    dormSlug: e.dormSlug,
    location: e.location,
    canceled: e.canceled,
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
