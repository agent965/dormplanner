import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bringItems } from "@/lib/db/schema";
import { ensureActor } from "@/lib/actor";
import { setGuestName } from "@/lib/guest";
import { newId } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().int().positive().max(99).default(1),
  note: z.string().max(200).optional(),
  guestName: z.string().trim().min(1).max(40).optional(),
});

// GET /api/events/:id/items — list all items (public)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await ctx.params;
  const rows = await db
    .select({
      id: bringItems.id,
      name: bringItems.name,
      quantity: bringItems.quantity,
      note: bringItems.note,
      createdByName: bringItems.createdByName,
      createdById: bringItems.createdById,
      createdByGuestId: bringItems.createdByGuestId,
      claimedByName: bringItems.claimedByName,
      claimedById: bringItems.claimedById,
      claimedByGuestId: bringItems.claimedByGuestId,
      updatedAt: bringItems.updatedAt,
    })
    .from(bringItems)
    .where(eq(bringItems.eventId, eventId))
    .orderBy(bringItems.createdAt);

  return NextResponse.json({ items: rows });
}

// POST /api/events/:id/items — create a new item (user OR guest)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await ctx.params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
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

  const id = newId();
  await db.insert(bringItems).values({
    id,
    eventId,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    note: parsed.data.note,
    createdByName: actor.displayName!,
    createdById: actor.kind === "user" ? actor.userId : null,
    createdByGuestId: actor.kind === "guest" ? actor.guestId : null,
  });
  return NextResponse.json({ id });
}
