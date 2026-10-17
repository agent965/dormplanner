import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { newId } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  dormSlug: z.string().optional(),
  location: z.string().max(120).optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  capacity: z.number().int().positive().max(1000).optional(),
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
  const id = newId();
  await db.insert(events).values({
    id,
    title: v.title,
    description: v.description ?? null,
    hostId: session.user.id,
    dormSlug: v.dormSlug || null,
    location: v.location ?? null,
    startsAt: new Date(v.startsAt),
    endsAt: v.endsAt ? new Date(v.endsAt) : null,
    capacity: v.capacity ?? null,
    openToAllDorms: v.openToAllDorms ?? false,
  });
  return NextResponse.json({ id });
}
