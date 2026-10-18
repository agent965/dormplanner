import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { DIETARY_TAG_VALUES, newId } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  dormSlug: z.string().optional(),
  location: z.string().max(120).optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  capacity: z.number().int().positive().max(1000).optional(),
  tags: z.array(z.enum(DIETARY_TAG_VALUES)).default([]),
  openToAllDorms: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
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

  const id = newId();
  await db.insert(events).values({
    id,
    title: v.title,
    description: v.description ?? null,
    hostId: session.user.id,
    dormSlug: v.dormSlug || null,
    location: v.location ?? null,
    startsAt: startsAtDate,
    endsAt: endsAtDate,
    capacity: v.capacity ?? null,
    tags: v.tags,
    openToAllDorms: v.openToAllDorms ?? false,
  });
  return NextResponse.json({ id });
}

