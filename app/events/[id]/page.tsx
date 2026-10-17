import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps, users } from "@/lib/db/schema";
import { BringList } from "@/components/BringList";
import { RsvpControl } from "@/components/RsvpControl";
import { formatEventTime } from "@/lib/utils";
import { dormName } from "@/lib/dorms";

export const dynamic = "force-dynamic";

export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const [row] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      location: events.location,
      dormSlug: events.dormSlug,
      capacity: events.capacity,
      openToAllDorms: events.openToAllDorms,
      hostId: events.hostId,
      hostName: users.name,
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(eq(events.id, id))
    .limit(1);

  if (!row) notFound();

  const yesCountRow = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, id), eq(rsvps.status, "yes")));
  const yesCount = yesCountRow[0]?.c ?? 0;

  const [myRsvp] = await db
    .select({ status: rsvps.status })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, id), eq(rsvps.userId, session.user.id)));

  const guests = await db
    .select({ name: users.name, status: rsvps.status })
    .from(rsvps)
    .leftJoin(users, eq(rsvps.userId, users.id))
    .where(eq(rsvps.eventId, id))
    .orderBy(desc(rsvps.updatedAt));

  const full = row.capacity != null && yesCount >= row.capacity;

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <div className="text-xs text-[color:var(--muted)]">
          {formatEventTime(new Date(row.startsAt))} · {dormName(row.dormSlug)}
          {row.location ? ` · ${row.location}` : ""}
        </div>
        <h1 className="text-2xl font-semibold">{row.title}</h1>
        <div className="text-sm text-[color:var(--muted)]">
          Hosted by {row.hostName ?? "someone"}
          {row.openToAllDorms ? " · open to all dorms" : ""}
        </div>
        {row.description ? (
          <p className="whitespace-pre-wrap text-sm pt-2">{row.description}</p>
        ) : null}
      </header>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Are you going?</h2>
          <div className="text-xs text-[color:var(--muted)]">
            {yesCount} going{row.capacity != null ? ` / ${row.capacity}` : ""}
          </div>
        </div>
        <RsvpControl eventId={row.id} initial={myRsvp?.status ?? null} full={full} />
        {guests.length > 0 ? (
          <ul className="pt-2 text-xs text-[color:var(--muted)] space-y-0.5">
            {guests
              .filter((g) => g.status === "yes")
              .map((g, i) => (
                <li key={i}>· {g.name ?? "someone"}</li>
              ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">What to bring</h2>
          <span className="text-xs text-[color:var(--muted)]">
            Live — anyone can add or claim
          </span>
        </div>
        <BringList eventId={row.id} currentUserId={session.user.id} />
      </section>
    </article>
  );
}
