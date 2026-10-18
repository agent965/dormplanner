import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, friendships, pastEvents, rsvps, users } from "@/lib/db/schema";

let tableEnsured: Promise<void> | null = null;

export async function ensureFriendshipsTable() {
  if (!tableEnsured) {
    tableEnsured = db
      .execute(
        sql`
        CREATE TABLE IF NOT EXISTS "friendships" (
          "id" text PRIMARY KEY NOT NULL,
          "requester_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "addressee_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "status" text DEFAULT 'pending' NOT NULL,
          "starred_by_requester" boolean DEFAULT false NOT NULL,
          "starred_by_addressee" boolean DEFAULT false NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        `
      )
      .then(() => {})
      .catch(() => {});
  }
  await tableEnsured;
}

export type FriendEntry = {
  friendshipId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  starred: boolean;
  sharedEventsCount: number;
};

export type IncomingRequestEntry = {
  friendshipId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  mostRecentSharedEvent: {
    id: string;
    title: string;
    startsAt: string;
  } | null;
};

export async function getProfileStats(userId: string, username: string) {
  await ensureFriendshipsTable();
  const lowerUsername = username.toLowerCase();

  // Friends count (accepted friendships involving userId)
  const friendRows = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        )
      )
    );

  // Incoming pending friend requests count for this user
  const incomingRows = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "pending"),
        eq(friendships.addresseeId, userId)
      )
    );

  // Past events where user said "yes" (attendeeUsernames) or hosted
  const pastRows = await db
    .select({
      id: pastEvents.id,
      hostName: pastEvents.hostName,
      attendeeUsernames: pastEvents.attendeeUsernames,
    })
    .from(pastEvents);

  const attendedEventIds = new Set<string>();
  for (const p of pastRows) {
    if (
      p.attendeeUsernames.some((u) => u.toLowerCase() === lowerUsername) ||
      p.hostName.toLowerCase() === lowerUsername
    ) {
      attendedEventIds.add(p.id);
    }
  }

  // Also include active non-canceled events where the user RSVP'd "yes"
  const activeYesRows = await db
    .select({ eventId: rsvps.eventId })
    .from(rsvps)
    .innerJoin(events, eq(rsvps.eventId, events.id))
    .where(
      and(
        eq(rsvps.userId, userId),
        eq(rsvps.status, "yes"),
        eq(events.canceled, false)
      )
    );
  for (const r of activeYesRows) {
    attendedEventIds.add(r.eventId);
  }

  return {
    friendsCount: friendRows.length,
    incomingRequestsCount: incomingRows.length,
    eventsAttendedCount: attendedEventIds.size,
  };
}

export async function getFriendshipRelation(
  viewerId: string | null | undefined,
  targetUserId: string | null | undefined
): Promise<{
  state: "self" | "none" | "pending_outgoing" | "pending_incoming" | "friends";
  friendshipId: string | null;
}> {
  if (!viewerId || !targetUserId) {
    return { state: "none", friendshipId: null };
  }
  if (viewerId === targetUserId) {
    return { state: "self", friendshipId: null };
  }

  await ensureFriendshipsTable();

  const rows = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, viewerId),
          eq(friendships.addresseeId, targetUserId)
        ),
        and(
          eq(friendships.requesterId, targetUserId),
          eq(friendships.addresseeId, viewerId)
        )
      )
    );

  const accepted = rows.find((r) => r.status === "accepted");
  if (accepted) {
    return { state: "friends", friendshipId: accepted.id };
  }

  const outgoing = rows.find(
    (r) => r.requesterId === viewerId && r.status === "pending"
  );
  if (outgoing) {
    return { state: "pending_outgoing", friendshipId: outgoing.id };
  }

  const incoming = rows.find(
    (r) => r.addresseeId === viewerId && r.status === "pending"
  );
  if (incoming) {
    return { state: "pending_incoming", friendshipId: incoming.id };
  }

  return { state: "none", friendshipId: null };
}

export async function getFriendsAndRequestsForUser(
  targetUserId: string,
  targetUsername: string
): Promise<{
  friends: FriendEntry[];
  incomingRequests: IncomingRequestEntry[];
}> {
  await ensureFriendshipsTable();
  const lowerTarget = targetUsername.toLowerCase();

  // Fetch all friendships involving targetUserId
  const allFriendships = await db
    .select()
    .from(friendships)
    .where(
      or(
        eq(friendships.requesterId, targetUserId),
        eq(friendships.addresseeId, targetUserId)
      )
    );

  const otherUserIds = Array.from(
    new Set(
      allFriendships.map((f) =>
        f.requesterId === targetUserId ? f.addresseeId : f.requesterId
      )
    )
  );

  const otherUsers =
    otherUserIds.length > 0
      ? await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar,
          })
          .from(users)
          .where(inArray(users.id, otherUserIds))
      : [];

  const userMap = new Map(otherUsers.map((u) => [u.id, u]));

  // Fetch all pastEvents and active "yes" RSVPs to compute shared events
  const allPast = await db
    .select({
      id: pastEvents.id,
      title: pastEvents.title,
      startsAt: pastEvents.startsAt,
      attendeeUsernames: pastEvents.attendeeUsernames,
    })
    .from(pastEvents)
    .orderBy(desc(pastEvents.startsAt));

  const relevantUserIds = [targetUserId, ...otherUserIds];
  const activeYesRsvps =
    relevantUserIds.length > 0
      ? await db
          .select({
            eventId: rsvps.eventId,
            userId: rsvps.userId,
            title: events.title,
            startsAt: events.startsAt,
          })
          .from(rsvps)
          .innerJoin(events, eq(rsvps.eventId, events.id))
          .where(
            and(
              inArray(rsvps.userId, relevantUserIds),
              eq(rsvps.status, "yes"),
              eq(events.canceled, false)
            )
          )
      : [];

  // Map userId -> Set of active eventIds where they said "yes"
  const activeYesByUser = new Map<string, Set<string>>();
  for (const r of activeYesRsvps) {
    if (!r.userId) continue;
    let set = activeYesByUser.get(r.userId);
    if (!set) {
      set = new Set();
      activeYesByUser.set(r.userId, set);
    }
    set.add(r.eventId);
  }

  const targetActiveYes = activeYesByUser.get(targetUserId) ?? new Set<string>();

  function computeSharedYesEventsCount(
    otherId: string,
    otherUsername: string
  ): number {
    const lowerOther = otherUsername.toLowerCase();
    const sharedIds = new Set<string>();

    // Past events where BOTH users said they were going (attendeeUsernames)
    for (const pe of allPast) {
      const lowerAttendees = pe.attendeeUsernames.map((u) => u.toLowerCase());
      if (
        lowerAttendees.includes(lowerTarget) &&
        lowerAttendees.includes(lowerOther)
      ) {
        sharedIds.add(pe.id);
      }
    }

    // Active events where BOTH users said "yes"
    const otherActiveYes = activeYesByUser.get(otherId) ?? new Set<string>();
    for (const evId of targetActiveYes) {
      if (otherActiveYes.has(evId)) {
        sharedIds.add(evId);
      }
    }

    return sharedIds.size;
  }

  function findMostRecentSharedPastEvent(otherUsername: string): {
    id: string;
    title: string;
    startsAt: string;
  } | null {
    const lowerOther = otherUsername.toLowerCase();
    // allPast is already ordered by startsAt DESC (most recent start date first)
    for (const pe of allPast) {
      const lowerAttendees = pe.attendeeUsernames.map((u) => u.toLowerCase());
      if (
        lowerAttendees.includes(lowerTarget) &&
        lowerAttendees.includes(lowerOther)
      ) {
        return {
          id: pe.id,
          title: pe.title,
          startsAt: new Date(pe.startsAt).toISOString(),
        };
      }
    }
    return null;
  }

  const friends: FriendEntry[] = [];
  const incomingRequests: IncomingRequestEntry[] = [];

  for (const f of allFriendships) {
    if (f.status === "accepted") {
      const isRequester = f.requesterId === targetUserId;
      const otherId = isRequester ? f.addresseeId : f.requesterId;
      const other = userMap.get(otherId);
      if (!other) continue;
      const starred = isRequester ? f.starredByRequester : f.starredByAddressee;
      friends.push({
        friendshipId: f.id,
        userId: other.id,
        username: other.username,
        displayName: other.displayName || other.username,
        avatar: other.avatar ?? null,
        starred,
        sharedEventsCount: computeSharedYesEventsCount(other.id, other.username),
      });
    } else if (f.status === "pending" && f.addresseeId === targetUserId) {
      const other = userMap.get(f.requesterId);
      if (!other) continue;
      incomingRequests.push({
        friendshipId: f.id,
        userId: other.id,
        username: other.username,
        displayName: other.displayName || other.username,
        avatar: other.avatar ?? null,
        mostRecentSharedEvent: findMostRecentSharedPastEvent(other.username),
      });
    }
  }

  // Sort friends: Starred first, then by sharedEventsCount descending, then alphabetically
  friends.sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    if (b.sharedEventsCount !== a.sharedEventsCount) {
      return b.sharedEventsCount - a.sharedEventsCount;
    }
    return a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    });
  });

  return { friends, incomingRequests };
}

