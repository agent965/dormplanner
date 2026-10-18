import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cleanupExpiredEvents, db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getFriendsAndRequestsForUser } from "@/lib/friends";
import { FriendsListClient } from "@/components/FriendsListClient";

export const dynamic = "force-dynamic";

export default async function UserFriendsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  await cleanupExpiredEvents();

  const { username: rawUsername } = await params;
  const targetUsername = decodeURIComponent(rawUsername).trim().toLowerCase();

  const [userRow] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .where(sql`lower(${users.username}) = ${targetUsername}`)
    .limit(1);

  if (!userRow) notFound();

  const session = await auth();
  const isMe = Boolean(session?.user?.id && session.user.id === userRow.id);

  const { friends, incomingRequests } = await getFriendsAndRequestsForUser(
    userRow.id,
    userRow.username
  );

  return (
    <FriendsListClient
      profileUsername={userRow.username}
      profileDisplayName={userRow.displayName || userRow.username}
      isMe={isMe}
      initialFriends={friends}
      initialRequests={isMe ? incomingRequests : []}
    />
  );
}

