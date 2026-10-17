import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, rsvps, users } from "@/lib/db/schema";
import { BringList } from "@/components/BringList";
import { RsvpControl } from "@/components/RsvpControl";
import { GuestNameGate } from "@/components/GuestNameGate";
import { dietaryTagLabel, formatEventTime } from "@/lib/utils";
import { dormName } from "@/lib/dorms";
import { readActor } from "@/lib/actor";

export const dynamic = "force-dynamic";

export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
      tags: events.tags,
      openToAllDorms: events.openToAllDorms,
      hostId: events.hostId,
      hostName: users.username,
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

  const actor = await readActor();

  // Find current viewer's RSVP (if any)
  let myRsvp: { status: "yes" | "maybe" | "no" } | undefined;
  if (actor?.kind === "user") {
    const [r] = await db
      .select({ status: rsvps.status })
      .from(rsvps)
      .where(and(eq(rsvps.eventId, id), eq(rsvps.userId, actor.userId)));
    myRsvp = r;
  } else if (actor?.kind === "guest") {
    const [r] = await db
      .select({ status: rsvps.status })
      .from(rsvps)
      .where(and(eq(rsvps.eventId, id), eq(rsvps.guestId, actor.guestId)));
    myRsvp = r;
  }

  const guestList = await db
    .select({
      name: users.username,
      guestName: rsvps.guestName,
      status: rsvps.status,
    })
    .from(rsvps)
    .leftJoin(users, eq(rsvps.userId, users.id))
    .where(eq(rsvps.eventId, id))
    .orderBy(desc(rsvps.updatedAt));

  const full = row.capacity != null && yesCount >= row.capacity;
  const isHost = actor?.kind === "user" && actor.userId === row.hostId;

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
        {row.tags && row.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {row.tags.map((t) => (
              <span key={t} className="tag">
                {dietaryTagLabel(t)}
              </span>
            ))}
          </div>
        ) : null}
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
        <GuestNameGate
          actorKind={actor?.kind ?? "guest"}
          initialName={actor?.kind === "guest" ? actor.displayName : null}
        />
        <RsvpControl
          eventId={row.id}
          initial={myRsvp?.status ?? null}
          full={full}
          actorKind={actor?.kind ?? "guest"}
          initialGuestName={actor?.kind === "guest" ? actor.displayName : null}
        />
        {guestList.length > 0 ? (
          <ul className="pt-2 text-xs text-[color:var(--muted)] space-y-0.5">
            {guestList
              .filter((g) => g.status === "yes")
              .map((g, i) => (
                <li key={i}>· {g.name ?? g.guestName ?? "someone"}</li>
              ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">What to bring</h2>
          <span className="text-xs text-[color:var(--muted)]">
            {isHost ? "You moderate · live" : "Anyone can suggest · live"}
          </span>
        </div>
        <BringList
          eventId={row.id}
          actorKind={actor?.kind ?? "guest"}
          userId={actor?.kind === "user" ? actor.userId : null}
          guestId={actor?.kind === "guest" ? actor.guestId : null}
          initialGuestName={actor?.kind === "guest" ? actor.displayName : null}
          isHost={isHost}
        />
      </section>
    </article>
  );
}
