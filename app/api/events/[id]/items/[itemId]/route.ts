import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bringItems, events } from "@/lib/db/schema";
import { ensureActor, type Actor } from "@/lib/actor";
import { setGuestName } from "@/lib/guest";

const patchSchema = z.object({
  action: z.enum(["claim", "unclaim", "edit", "delete", "approve"]),
  name: z.string().min(1).max(80).optional(),
  quantity: z.number().int().positive().max(99).optional(),
  note: z.string().max(200).optional(),
  guestName: z.string().trim().min(1).max(40).optional(),
});

function isClaimer(
  row: { claimedById: string | null; claimedByGuestId: string | null },
  actor: Actor
): boolean {
  if (actor.kind === "user") return row.claimedById === actor.userId;
  return row.claimedByGuestId === actor.guestId;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: eventId, itemId } = await ctx.params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const actor = await ensureActor();
  if (actor.kind === "guest" && parsed.data.guestName) {
    await setGuestName(parsed.data.guestName);
    actor.displayName = parsed.data.guestName;
  }
  if (actor.kind === "guest" && !actor.displayName && parsed.data.action !== "delete") {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(bringItems)
    .where(and(eq(bringItems.id, itemId), eq(bringItems.eventId, eventId)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [eventRow] = await db
    .select({ hostId: events.hostId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const isHost = actor.kind === "user" && actor.userId === eventRow?.hostId;

  const now = new Date();

  if (parsed.data.action === "approve") {
    if (!isHost) return NextResponse.json({ error: "host only" }, { status: 403 });
    await db
      .update(bringItems)
      .set({ approved: true, updatedAt: now })
      .where(eq(bringItems.id, itemId));
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "delete") {
    if (!isHost) return NextResponse.json({ error: "host only" }, { status: 403 });
    await db.delete(bringItems).where(eq(bringItems.id, itemId));
    return NextResponse.json({ ok: true });
  }

  // claim/unclaim/edit need the item to be approved (or you're the host)
  if (!existing.approved && !isHost) {
    return NextResponse.json({ error: "not yet approved" }, { status: 403 });
  }

  if (parsed.data.action === "claim") {
    const alreadyClaimed = existing.claimedById || existing.claimedByGuestId;
    if (alreadyClaimed && !isClaimer(existing, actor)) {
      return NextResponse.json({ error: "already claimed" }, { status: 409 });
    }
    await db
      .update(bringItems)
      .set({
        claimedByName: actor.displayName!,
        claimedById: actor.kind === "user" ? actor.userId : null,
        claimedByGuestId: actor.kind === "guest" ? actor.guestId : null,
        updatedAt: now,
      })
      .where(eq(bringItems.id, itemId));
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "unclaim") {
    if (!isClaimer(existing, actor) && !isHost) {
      return NextResponse.json({ error: "not your claim" }, { status: 403 });
    }
    await db
      .update(bringItems)
      .set({
        claimedByName: null,
        claimedById: null,
        claimedByGuestId: null,
        updatedAt: now,
      })
      .where(eq(bringItems.id, itemId));
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "edit") {
    if (!isHost) return NextResponse.json({ error: "host only" }, { status: 403 });
    await db
      .update(bringItems)
      .set({
        name: parsed.data.name ?? existing.name,
        quantity: parsed.data.quantity ?? existing.quantity,
        note: parsed.data.note ?? existing.note,
        updatedAt: now,
      })
      .where(eq(bringItems.id, itemId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
