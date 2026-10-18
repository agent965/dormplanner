import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { ensureActor } from "@/lib/actor";
import { setGuestName } from "@/lib/guest";
import { newId } from "@/lib/utils";

const bodySchema = z.object({
  status: z.enum(["yes", "maybe", "no"]),
  note: z.string().max(200).optional(),
  guestName: z.string().trim().min(1).max(40).optional(),
  fingerprint: z.string().min(8).max(128).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await ctx.params;
  const [ev] = await db
    .select({ canceled: events.canceled })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!ev || ev.canceled) {
    return NextResponse.json({ error: "event_canceled" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await ensureActor();

  if (actor.kind === "guest" && parsed.data.guestName) {
    await setGuestName(parsed.data.guestName);
    actor.displayName = parsed.data.guestName;
  }
  if (actor.kind === "guest" && !actor.displayName) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const now = new Date();

  if (actor.kind === "user") {
    const [existing] = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.userId, actor.userId)));
    if (existing) {
      await db
        .update(rsvps)
        .set({ status: parsed.data.status, note: parsed.data.note, updatedAt: now })
        .where(eq(rsvps.id, existing.id));
    } else {
      await db.insert(rsvps).values({
        id: newId(),
        eventId,
        userId: actor.userId,
        status: parsed.data.status,
        note: parsed.data.note,
        updatedAt: now,
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Guest flow: match by guestId OR fingerprint (fingerprint catches cookie-clearers)
  const fp = parsed.data.fingerprint ?? null;
  const matchClause = fp
    ? or(eq(rsvps.guestId, actor.guestId), eq(rsvps.fingerprint, fp))
    : eq(rsvps.guestId, actor.guestId);

  const [existing] = await db
    .select({ id: rsvps.id })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), matchClause))
    .limit(1);

  if (existing) {
    await db
      .update(rsvps)
      .set({
        status: parsed.data.status,
        note: parsed.data.note,
        guestName: actor.displayName,
        guestId: actor.guestId,
        fingerprint: fp,
        updatedAt: now,
      })
      .where(eq(rsvps.id, existing.id));
    return NextResponse.json({ ok: true });
  }

  try {
    await db.insert(rsvps).values({
      id: newId(),
      eventId,
      guestId: actor.guestId,
      guestName: actor.displayName,
      fingerprint: fp,
      status: parsed.data.status,
      note: parsed.data.note,
      updatedAt: now,
    });
  } catch (e: unknown) {
    // Unique index collision on (event_id, fingerprint): someone already
    // RSVP'd from this device with a different cookie.
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("rsvps_event_fingerprint_uidx") || msg.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "already_rsvpd" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
