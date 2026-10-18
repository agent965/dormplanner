import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { DIETARY_TAG_VALUES } from "@/lib/utils";

const plannedDishSchema = z.object({
  name: z.string().trim().min(1).max(1000),
  imageUrl: z.string().max(5_000_000).nullable().optional(),
  link: z.string().max(2000).nullable().optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  dormSlug: z.string().nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  capacity: z.number().int().positive().max(1000).nullable().optional(),
  tags: z.array(z.enum(DIETARY_TAG_VALUES)).default([]),
  plannedDishes: z.array(plannedDishSchema).optional(),
  openToAllDorms: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const [existing] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.hostId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const v = parsed.data;
  const startsAtDate = new Date(v.startsAt);
  const endsAtDate = v.endsAt
    ? new Date(v.endsAt)
    : new Date(startsAtDate.getTime() + 2 * 60 * 60 * 1000);

  if (isNaN(startsAtDate.getTime()) || isNaN(endsAtDate.getTime()) || endsAtDate <= startsAtDate) {
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  }

  if (v.capacity != null) {
    const yesCountRow = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(rsvps)
      .where(and(eq(rsvps.eventId, id), eq(rsvps.status, "yes")));
    const yesCount = yesCountRow[0]?.c ?? 0;

    if (yesCount > v.capacity) {
      return NextResponse.json(
        {
          error: "capacity_exceeded",
          yesCount,
          message: `There are already ${yesCount} people going, which is more than the new capacity of ${v.capacity}. Changes were not saved.`,
        },
        { status: 400 }
      );
    }
  }

  await db
    .update(events)
    .set({
      title: v.title,
      description: v.description || null,
      dormSlug: v.dormSlug || null,
      location: v.location || null,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
      capacity: v.capacity ?? null,
      tags: v.tags,
      ...(v.plannedDishes !== undefined ? { plannedDishes: v.plannedDishes } : {}),
      openToAllDorms: v.openToAllDorms ?? false,
    })
    .where(eq(events.id, id));

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const [existing] = await db
    .select({ id: events.id, hostId: events.hostId })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.hostId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Kick out all people who joined and mark event as canceled
  await db.delete(rsvps).where(eq(rsvps.eventId, id));
  await db
    .update(events)
    .set({ canceled: true })
    .where(eq(events.id, id));

  return NextResponse.json({ ok: true });
}

