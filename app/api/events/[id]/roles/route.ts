import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, ensureEventRoleColumns } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { ensureActor, type Actor } from "@/lib/actor";
import { setGuestName } from "@/lib/guest";

const patchSchema = z.object({
  role: z.enum(["cook", "dishwasher"]),
  action: z.enum(["claim", "unclaim"]),
  guestName: z.string().trim().min(1).max(40).optional(),
});

function isRoleClaimer(
  claimedById: string | null,
  claimedByGuestId: string | null,
  actor: Actor
): boolean {
  if (actor.kind === "user") return claimedById === actor.userId;
  return claimedByGuestId === actor.guestId;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await ensureEventRoleColumns();
  const { id } = await ctx.params;

  const [row] = await db
    .select({
      lookingForDishwasher: events.lookingForDishwasher,
      lookingForCook: events.lookingForCook,
      lookingForIngredients: events.lookingForIngredients,
      lookingForCookware: events.lookingForCookware,
      dishwasherClaimedById: events.dishwasherClaimedById,
      dishwasherClaimedByGuestId: events.dishwasherClaimedByGuestId,
      dishwasherClaimedByName: events.dishwasherClaimedByName,
      cookClaimedById: events.cookClaimedById,
      cookClaimedByGuestId: events.cookClaimedByGuestId,
      cookClaimedByName: events.cookClaimedByName,
    })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await ensureEventRoleColumns();
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
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

  const [existing] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isHost = actor.kind === "user" && actor.userId === existing.hostId;
  const { role, action } = parsed.data;

  if (role === "dishwasher") {
    if (action === "claim") {
      const alreadyClaimed =
        existing.dishwasherClaimedById || existing.dishwasherClaimedByGuestId;
      if (
        alreadyClaimed &&
        !isRoleClaimer(
          existing.dishwasherClaimedById,
          existing.dishwasherClaimedByGuestId,
          actor
        )
      ) {
        return NextResponse.json({ error: "already_claimed" }, { status: 409 });
      }
      await db
        .update(events)
        .set({
          dishwasherClaimedByName: actor.displayName!,
          dishwasherClaimedById: actor.kind === "user" ? actor.userId : null,
          dishwasherClaimedByGuestId: actor.kind === "guest" ? actor.guestId : null,
          lookingForDishwasher: false,
        })
        .where(eq(events.id, id));
      return NextResponse.json({ ok: true });
    } else {
      if (
        !isRoleClaimer(
          existing.dishwasherClaimedById,
          existing.dishwasherClaimedByGuestId,
          actor
        ) &&
        !isHost
      ) {
        return NextResponse.json({ error: "not_your_claim" }, { status: 403 });
      }
      await db
        .update(events)
        .set({
          dishwasherClaimedByName: null,
          dishwasherClaimedById: null,
          dishwasherClaimedByGuestId: null,
          lookingForDishwasher: true,
        })
        .where(eq(events.id, id));
      return NextResponse.json({ ok: true });
    }
  } else {
    if (action === "claim") {
      const alreadyClaimed =
        existing.cookClaimedById || existing.cookClaimedByGuestId;
      if (
        alreadyClaimed &&
        !isRoleClaimer(
          existing.cookClaimedById,
          existing.cookClaimedByGuestId,
          actor
        )
      ) {
        return NextResponse.json({ error: "already_claimed" }, { status: 409 });
      }
      await db
        .update(events)
        .set({
          cookClaimedByName: actor.displayName!,
          cookClaimedById: actor.kind === "user" ? actor.userId : null,
          cookClaimedByGuestId: actor.kind === "guest" ? actor.guestId : null,
          lookingForCook: false,
        })
        .where(eq(events.id, id));
      return NextResponse.json({ ok: true });
    } else {
      if (
        !isRoleClaimer(
          existing.cookClaimedById,
          existing.cookClaimedByGuestId,
          actor
        ) &&
        !isHost
      ) {
        return NextResponse.json({ error: "not_your_claim" }, { status: 403 });
      }
      await db
        .update(events)
        .set({
          cookClaimedByName: null,
          cookClaimedById: null,
          cookClaimedByGuestId: null,
          lookingForCook: true,
        })
        .where(eq(events.id, id));
      return NextResponse.json({ ok: true });
    }
  }
}

