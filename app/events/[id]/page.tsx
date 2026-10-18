import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { cleanupExpiredEvents, db } from "@/lib/db";
import { events, rsvps, users } from "@/lib/db/schema";
import { BringList } from "@/components/BringList";
import { RsvpControl } from "@/components/RsvpControl";
import { GuestNameGate } from "@/components/GuestNameGate";
import { HostEventActions } from "@/components/HostEventActions";
import { PlannedDishesList } from "@/components/PlannedDishes";
import {
  dietaryTagLabel,
  formatEventTime,
  getInProgressRemaining,
} from "@/lib/utils";
import { dormName } from "@/lib/dorms";
import { readActor } from "@/lib/actor";

export const dynamic = "force-dynamic";

export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await cleanupExpiredEvents();

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
      plannedDishes: events.plannedDishes,
      openToAllDorms: events.openToAllDorms,
      canceled: events.canceled,
      hostId: events.hostId,
      hostName: users.username,
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(eq(events.id, id))
    .limit(1);

  if (!row) notFound();
  if (row.canceled) redirect("/");

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

  const goingList = guestList.filter((g) => g.status === "yes");
  const maybeList = guestList.filter((g) => g.status === "maybe");
  const cantGoList = guestList.filter((g) => g.status === "no");
  const hasRsvpBubbles =
    goingList.length > 0 || maybeList.length > 0 || cantGoList.length > 0;

  const full = row.capacity != null && yesCount >= row.capacity;
  const isHost = actor?.kind === "user" && actor.userId === row.hostId;
  const inProgressLeft = getInProgressRemaining(
    new Date(row.startsAt),
    row.endsAt ? new Date(row.endsAt) : null
  );

  function renderGuestBubble(
    g: { name: string | null; guestName: string | null },
    key: string,
    bubbleClass: string
  ) {
    const label = g.name ?? g.guestName ?? "guest";
    const cls = `inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${bubbleClass}`;
    if (g.name) {
      return (
        <Link
          key={key}
          href={`/users/${encodeURIComponent(g.name)}`}
          className={`${cls} hover:underline`}
        >
          {label}
        </Link>
      );
    }
    return (
      <span key={key} className={cls}>
        {label}
      </span>
    );
  }

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <div className="text-xs text-[color:var(--muted)]">
          {formatEventTime(new Date(row.startsAt))}
          {row.endsAt ? ` – ${formatEventTime(new Date(row.endsAt))}` : ""} ·{" "}
          {dormName(row.dormSlug)}
          {row.location ? ` · ${row.location}` : ""}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold">{row.title}</h1>
          {inProgressLeft ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[color:var(--success)] text-white">
              In Progress, {inProgressLeft} left
            </span>
          ) : null}
        </div>
        <div className="text-sm text-[color:var(--muted)]">
          Hosted by{" "}
          {row.hostName ? (
            <Link
              href={`/users/${encodeURIComponent(row.hostName)}`}
              className="underline hover:text-[color:var(--husky-purple)]"
            >
              {row.hostName}
            </Link>
          ) : (
            "someone"
          )}
          {row.openToAllDorms ? " · open to all dorms" : ""}
        </div>
        {hasRsvpBubbles ? (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {goingList.map((g, i) =>
              renderGuestBubble(
                g,
                `yes-${i}`,
                "bg-[color:var(--crust)] text-white border border-[color:var(--crust)]"
              )
            )}
            {maybeList.map((g, i) =>
              renderGuestBubble(
                g,
                `maybe-${i}`,
                "bg-[#F9E076] text-[#1a1a1a] border border-[#e5c858]"
              )
            )}
            {cantGoList.map((g, i) =>
              renderGuestBubble(
                g,
                `no-${i}`,
                "bg-white text-[#dc2626] border border-[#dc2626]"
              )
            )}
          </div>
        ) : null}
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
        <PlannedDishesList dishes={row.plannedDishes} />
        {isHost ? (
          <HostEventActions
            event={{
              id: row.id,
              title: row.title,
              description: row.description,
              dormSlug: row.dormSlug,
              location: row.location,
              startsAt: new Date(row.startsAt).toISOString(),
              endsAt: row.endsAt ? new Date(row.endsAt).toISOString() : null,
              capacity: row.capacity,
              tags: row.tags ?? [],
              plannedDishes: row.plannedDishes ?? [],
              openToAllDorms: row.openToAllDorms,
              yesCount,
            }}
          />
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
