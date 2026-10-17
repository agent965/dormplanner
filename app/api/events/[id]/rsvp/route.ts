import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rsvps } from "@/lib/db/schema";

const bodySchema = z.object({
  status: z.enum(["yes", "maybe", "no"]),
  note: z.string().max(200).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db
    .insert(rsvps)
    .values({
      eventId,
      userId: session.user.id,
      status: parsed.data.status,
      note: parsed.data.note,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [rsvps.eventId, rsvps.userId],
      set: {
        status: parsed.data.status,
        note: parsed.data.note,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
