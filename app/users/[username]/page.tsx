import { desc, sql } from "drizzle-orm";
import { cleanupExpiredEvents, db } from "@/lib/db";
import { pastEvents, users } from "@/lib/db/schema";
import { PastEventCard } from "@/components/PastEventCard";
import { dormName } from "@/lib/dorms";

export const dynamic = "force-dynamic";

export default async function UserHistoryPage({
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
    })
    .from(users)
    .where(sql`lower(${users.username}) = ${targetUsername}`)
    .limit(1);

  const displayUsername = userRow?.username ?? decodeURIComponent(rawUsername);

  const allPast = await db
    .select()
    .from(pastEvents)
    .orderBy(desc(pastEvents.endsAt))
    .limit(100);

  const userEvents = allPast.filter(
    (e) =>
      e.hostName.toLowerCase() === targetUsername ||
      e.attendeeUsernames.some((u) => u.toLowerCase() === targetUsername) ||
      e.attendeeNames.some((n) => n.toLowerCase() === targetUsername) ||
      (e.maybeUsernames ?? []).some((u) => u.toLowerCase() === targetUsername) ||
      (e.maybeNames ?? []).some((n) => n.toLowerCase() === targetUsername)
  );

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-1">
        <h1 className="text-xl font-semibold">@{displayUsername}&apos;s History</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {userRow?.dormSlug ? (
            <>
              {dormName(userRow.dormSlug)}
              {userRow.floor ? ` · floor ${userRow.floor}` : ""} ·{" "}
            </>
          ) : null}
          Past events hosted or attended by @{displayUsername}.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Past Events ({userEvents.length})
        </h2>
        {userEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
            No past events found for @{displayUsername} yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {userEvents.map((e) => (
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

