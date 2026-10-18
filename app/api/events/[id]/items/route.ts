import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db, ensureEventRoleColumns, syncEventNecessaryTags } from "@/lib/db";
import { bringItems, events } from "@/lib/db/schema";
import { ensureActor, readActor } from "@/lib/actor";
import { setGuestName } from "@/lib/guest";
import { newId } from "@/lib/utils";

export const BRING_CATEGORIES = [
  "Ingredients",
  "Cookware/Utensils",
  "Food/Dishes",
  "Other",
] as const;

const createSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().int().positive().max(99).default(1),
  category: z.enum(BRING_CATEGORIES),
  absolutelyNecessary: z.boolean().optional().default(false),
  note: z.string().max(200).optional(),
  guestName: z.string().trim().min(1).max(40).optional(),
});

async function getHostId(eventId: string): Promise<string | null> {
  const [e] = await db
    .select({ hostId: events.hostId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return e?.hostId ?? null;
}

// GET /api/events/:id/items: returns all items (approved and pending) for everyone, sorted with absolutelyNecessary first
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureEventRoleColumns();
  const { id: eventId } = await ctx.params;
  const [actor, hostId] = await Promise.all([readActor(), getHostId(eventId)]);
  const isHost = actor?.kind === "user" && actor.userId === hostId;

  const rows = await db
    .select({
      id: bringItems.id,
      name: bringItems.name,
      quantity: bringItems.quantity,
      category: bringItems.category,
      absolutelyNecessary: bringItems.absolutelyNecessary,
      note: bringItems.note,
      approved: bringItems.approved,
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
    .orderBy(desc(bringItems.absolutelyNecessary), bringItems.createdAt);

  return NextResponse.json({ items: rows, isHost });
}

// POST /api/events/:id/items: anyone can suggest; host-added items are auto-approved
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureEventRoleColumns();
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

  const hostId = await getHostId(eventId);
  if (!hostId) return NextResponse.json({ error: "not found" }, { status: 404 });
  const isHost = actor.kind === "user" && actor.userId === hostId;

  const id = newId();
  const isNecessary = isHost ? Boolean(parsed.data.absolutelyNecessary) : false;
  await db.insert(bringItems).values({
    id,
    eventId,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    category: parsed.data.category,
    absolutelyNecessary: isNecessary,
    note: parsed.data.note,
    createdByName: actor.displayName!,
    createdById: actor.kind === "user" ? actor.userId : null,
    createdByGuestId: actor.kind === "guest" ? actor.guestId : null,
    approved: isHost,
  });

  if (isNecessary) {
    await syncEventNecessaryTags(eventId);
  }

  return NextResponse.json({ id, approved: isHost });
}


