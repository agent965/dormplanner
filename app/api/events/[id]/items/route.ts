import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bringItems, users } from "@/lib/db/schema";
import { newId } from "@/lib/utils";

const DIETARY_TAGS = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "halal",
  "kosher",
  "contains_pork",
  "contains_alcohol",
] as const;

const createSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().int().positive().max(99).default(1),
  tags: z.array(z.enum(DIETARY_TAGS)).default([]),
  note: z.string().max(200).optional(),
});

// GET /api/events/:id/items — list all items with claimer info (for polling)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await ctx.params;
  const rows = await db
    .select({
      id: bringItems.id,
      name: bringItems.name,
      quantity: bringItems.quantity,
      tags: bringItems.tags,
      note: bringItems.note,
      claimedById: bringItems.claimedById,
      claimedByName: users.name,
      createdById: bringItems.createdById,
      updatedAt: bringItems.updatedAt,
    })
    .from(bringItems)
    .leftJoin(users, eq(bringItems.claimedById, users.id))
    .where(eq(bringItems.eventId, eventId))
    .orderBy(bringItems.createdAt);

  return NextResponse.json({ items: rows });
}

// POST /api/events/:id/items — create a new item
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const id = newId();
  await db.insert(bringItems).values({
    id,
    eventId,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    tags: parsed.data.tags,
    note: parsed.data.note,
    createdById: session.user.id,
  });
  return NextResponse.json({ id });
}
