import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bringItems } from "@/lib/db/schema";

const patchSchema = z.object({
  action: z.enum(["claim", "unclaim", "edit", "delete"]),
  name: z.string().min(1).max(80).optional(),
  quantity: z.number().int().positive().max(99).optional(),
  note: z.string().max(200).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: eventId, itemId } = await ctx.params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [existing] = await db
    .select()
    .from(bringItems)
    .where(and(eq(bringItems.id, itemId), eq(bringItems.eventId, eventId)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date();

  if (parsed.data.action === "claim") {
    if (existing.claimedById && existing.claimedById !== session.user.id) {
      return NextResponse.json({ error: "already claimed" }, { status: 409 });
    }
    await db
      .update(bringItems)
      .set({ claimedById: session.user.id, updatedAt: now })
      .where(eq(bringItems.id, itemId));
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "unclaim") {
    if (existing.claimedById !== session.user.id) {
      return NextResponse.json({ error: "not your claim" }, { status: 403 });
    }
    await db
      .update(bringItems)
      .set({ claimedById: null, updatedAt: now })
      .where(eq(bringItems.id, itemId));
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "edit") {
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

  if (parsed.data.action === "delete") {
    if (existing.createdById !== session.user.id) {
      return NextResponse.json({ error: "only creator can delete" }, { status: 403 });
    }
    await db.delete(bringItems).where(eq(bringItems.id, itemId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
