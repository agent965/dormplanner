import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cleanupExpiredEvents, db } from "@/lib/db";
import { events, pastEvents, rsvps, users } from "@/lib/db/schema";
import { PastEventCard } from "@/components/PastEventCard";
import { EventCard } from "@/components/EventCard";
import { Avatar } from "@/components/Avatar";
import { dormName } from "@/lib/dorms";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
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
      dormSlug: users.dormSlug,
      floor: users.floor,
      displayName: users.displayName,
      bio: users.bio,
      major: users.major,
      campus: users.campus,
      year: users.year,
      pronouns: users.pronouns,
      avatar: users.avatar,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`lower(${users.username}) = ${targetUsername}`)
    .limit(1);

  const session = await auth();
  const isMe = session?.user?.id && userRow?.id === session.user.id;

  const displayUsername = userRow?.username ?? decodeURIComponent(rawUsername);
  const displayName = userRow?.displayName || displayUsername;

  // Upcoming events this user is hosting
  const now = new Date();
  const upcoming = userRow
    ? await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          startsAt: events.startsAt,
          endsAt: events.endsAt,
          location: events.location,
          dormSlug: events.dormSlug,
          capacity: events.capacity,
          tags: events.tags,
          canceled: events.canceled,
          rsvpYesCount: sql<number>`(
            select count(*)::int from ${rsvps}
            where ${rsvps.eventId} = ${events.id} and ${rsvps.status} = 'yes'
          )`.as("yes_count"),
        })
        .from(events)
        .where(and(eq(events.hostId, userRow.id), gte(events.startsAt, now)))
        .orderBy(events.startsAt)
    : [];

  // Past events this user hosted or attended
  const allPast = await db
    .select()
    .from(pastEvents)
    .orderBy(desc(pastEvents.endsAt))
    .limit(100);

  const userPast = allPast.filter(
    (e) =>
      e.hostName.toLowerCase() === targetUsername ||
      e.attendeeUsernames.some((u) => u.toLowerCase() === targetUsername) ||
      (e.maybeUsernames ?? []).some((u) => u.toLowerCase() === targetUsername)
  );

  const facts: Array<{ label: string; value: string }> = [];
  if (userRow?.pronouns) facts.push({ label: "", value: userRow.pronouns });
  if (userRow?.year) facts.push({ label: "", value: userRow.year });
  if (userRow?.major) facts.push({ label: "Major", value: userRow.major });
  if (userRow?.campus) facts.push({ label: "", value: userRow.campus });
  if (userRow?.dormSlug) {
    facts.push({
      label: "",
      value:
        dormName(userRow.dormSlug) +
        (userRow.floor ? ` · floor ${userRow.floor}` : ""),
    });
  }

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <section className="card p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar src={userRow?.avatar} name={displayName} size={88} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="display text-2xl font-semibold leading-tight">
                {displayName}
              </h1>
              {userRow?.displayName ? (
                <span className="text-sm text-[color:var(--muted)]">
                  @{displayUsername}
                </span>
              ) : null}
            </div>
            {facts.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--muted)]">
                {facts.map((f, i) => (
                  <span key={i} className="inline-flex items-center">
                    {f.label ? (
                      <span className="font-medium mr-1">{f.label}:</span>
                    ) : null}
                    {f.value}
                    {i < facts.length - 1 ? (
                      <span className="ml-3 opacity-40">·</span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
            {userRow?.bio ? (
              <p className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">
                {userRow.bio}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--muted)] italic">
                {isMe
                  ? "No bio yet — "
                  : `${displayName} hasn't written a bio yet.`}
                {isMe ? (
                  <Link href="/profile" className="underline">
                    add one
                  </Link>
                ) : null}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Upcoming hosted events */}
      {upcoming.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
            Hosting next ({upcoming.length})
          </h2>
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e.id}>
                <EventCard
                  id={e.id}
                  title={e.title}
                  description={e.description}
                  startsAt={new Date(e.startsAt).toISOString()}
                  endsAt={e.endsAt ? new Date(e.endsAt).toISOString() : null}
                  location={e.location}
                  dormSlug={e.dormSlug}
                  rsvpYesCount={e.rsvpYesCount}
                  capacity={e.capacity}
                  tags={e.tags}
                  canceled={e.canceled}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Past events (hosted + attended) */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          History ({userPast.length})
        </h2>
        {userPast.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
            {isMe
              ? "You haven't hosted or attended any completed events yet. Once events wrap up they'll show here."
              : `${displayName} hasn't hosted or attended any completed events yet.`}
          </div>
        ) : (
          <ul className="space-y-2">
            {userPast.map((e) => (
              <li key={e.id}>
                <PastEventCard
                  event={{
                    ...e,
                    startsAt: new Date(e.startsAt),
                    endsAt: new Date(e.endsAt),
                  }}
                  roleLabel={
                    e.hostName.toLowerCase() === targetUsername
                      ? "Hosted"
                      : "Attended"
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
