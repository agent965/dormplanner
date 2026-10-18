import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendships } from "@/lib/db/schema";
import { ensureFriendshipsTable } from "@/lib/friends";
import { newId } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const meId = session.user.id;

  await ensureFriendshipsTable();

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string | undefined;
  const targetUserId = body?.targetUserId as string | undefined;
  const friendshipId = body?.friendshipId as string | undefined;

  if (action === "request") {
    if (!targetUserId || targetUserId === meId) {
      return NextResponse.json({ error: "invalid_target" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterId, meId),
            eq(friendships.addresseeId, targetUserId)
          ),
          and(
            eq(friendships.requesterId, targetUserId),
            eq(friendships.addresseeId, meId)
          )
        )
      );

    if (existing.length > 0) {
      const row = existing[0];
      if (row.status === "accepted") {
        return NextResponse.json({ state: "friends", friendshipId: row.id });
      }
      // If the other user had already sent us a request, accept it!
      if (row.requesterId === targetUserId && row.status === "pending") {
        await db
          .update(friendships)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(eq(friendships.id, row.id));
        return NextResponse.json({ state: "friends", friendshipId: row.id });
      }
      return NextResponse.json({
        state: "pending_outgoing",
        friendshipId: row.id,
      });
    }

    const id = newId();
    await db.insert(friendships).values({
      id,
      requesterId: meId,
      addresseeId: targetUserId,
      status: "pending",
    });

    return NextResponse.json({ state: "pending_outgoing", friendshipId: id });
  }

  if (action === "accept") {
    const whereClause = friendshipId
      ? and(
          eq(friendships.id, friendshipId),
          eq(friendships.addresseeId, meId)
        )
      : targetUserId
        ? and(
            eq(friendships.requesterId, targetUserId),
            eq(friendships.addresseeId, meId)
          )
        : null;

    if (!whereClause) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const [row] = await db.select().from(friendships).where(whereClause).limit(1);
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await db
      .update(friendships)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(friendships.id, row.id));

    return NextResponse.json({ ok: true, friendshipId: row.id, state: "friends" });
  }

  if (action === "deny") {
    const whereClause = friendshipId
      ? and(
          eq(friendships.id, friendshipId),
          eq(friendships.addresseeId, meId)
        )
      : targetUserId
        ? and(
            eq(friendships.requesterId, targetUserId),
            eq(friendships.addresseeId, meId)
          )
        : null;

    if (!whereClause) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    await db.delete(friendships).where(whereClause);
    return NextResponse.json({ ok: true });
  }

  if (action === "restore_request") {
    if (!targetUserId || targetUserId === meId) {
      return NextResponse.json({ error: "invalid_target" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterId, targetUserId),
            eq(friendships.addresseeId, meId)
          ),
          and(
            eq(friendships.requesterId, meId),
            eq(friendships.addresseeId, targetUserId)
          )
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({
        ok: true,
        friendshipId: existing[0].id,
      });
    }

    const id = friendshipId || newId();
    await db.insert(friendships).values({
      id,
      requesterId: targetUserId,
      addresseeId: meId,
      status: "pending",
    });

    return NextResponse.json({ ok: true, friendshipId: id });
  }

  if (action === "unfriend" || action === "remove") {
    if (friendshipId) {
      await db
        .delete(friendships)
        .where(
          and(
            eq(friendships.id, friendshipId),
            or(
              eq(friendships.requesterId, meId),
              eq(friendships.addresseeId, meId)
            )
          )
        );
      return NextResponse.json({ ok: true, state: "none" });
    }

    if (targetUserId) {
      await db
        .delete(friendships)
        .where(
          or(
            and(
              eq(friendships.requesterId, meId),
              eq(friendships.addresseeId, targetUserId)
            ),
            and(
              eq(friendships.requesterId, targetUserId),
              eq(friendships.addresseeId, meId)
            )
          )
        );
      return NextResponse.json({ ok: true, state: "none" });
    }

    return NextResponse.json({ error: "missing_target" }, { status: 400 });
  }

  if (action === "toggle_star") {
    const whereClause = friendshipId
      ? and(
          eq(friendships.id, friendshipId),
          or(
            eq(friendships.requesterId, meId),
            eq(friendships.addresseeId, meId)
          )
        )
      : targetUserId
        ? or(
            and(
              eq(friendships.requesterId, meId),
              eq(friendships.addresseeId, targetUserId)
            ),
            and(
              eq(friendships.requesterId, targetUserId),
              eq(friendships.addresseeId, meId)
            )
          )
        : null;

    if (!whereClause) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const [row] = await db.select().from(friendships).where(whereClause).limit(1);
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const isRequester = row.requesterId === meId;
    const nextStarred = isRequester
      ? !row.starredByRequester
      : !row.starredByAddressee;

    await db
      .update(friendships)
      .set(
        isRequester
          ? { starredByRequester: nextStarred, updatedAt: new Date() }
          : { starredByAddressee: nextStarred, updatedAt: new Date() }
      )
      .where(eq(friendships.id, row.id));

    return NextResponse.json({ ok: true, starred: nextStarred });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

