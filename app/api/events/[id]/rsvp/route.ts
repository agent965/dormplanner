import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { ensureActor } from "@/lib/actor";
import { setGuestName } from "@/lib/guest";
import { newId } from "@/lib/utils";

const bodySchema = z.object({
  status: z.enum(["yes", "maybe", "no"]),
  note: z.string().max(200).optional(),
  // If a guest hasn't set a name yet, they can pass it here and we'll store the cookie.
  guestName: z.string().trim().min(1).max(40).optional(),
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

  // If the user is a guest and gave us a name, remember it for next time.
  if (actor.kind === "guest" && parsed.data.guestName) {
    await setGuestName(parsed.data.guestName);
    actor.displayName = parsed.data.guestName;
  }

  if (actor.kind === "guest" && !actor.displayName) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const now = new Date();

  if (actor.kind === "user") {
    // Upsert by (eventId, userId)
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
  } else {
    // Guest: upsert by (eventId, guestId)
    const [existing] = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.guestId, actor.guestId)));
    if (existing) {
      await db
        .update(rsvps)
        .set({
          status: parsed.data.status,
          note: parsed.data.note,
          guestName: actor.displayName,
          updatedAt: now,
        })
        .where(eq(rsvps.id, existing.id));
    } else {
      await db.insert(rsvps).values({
        id: newId(),
        eventId,
        guestId: actor.guestId,
        guestName: actor.displayName,
        status: parsed.data.status,
        note: parsed.data.note,
        updatedAt: now,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
