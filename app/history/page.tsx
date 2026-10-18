import { desc } from "drizzle-orm";
import { cleanupExpiredEvents, db } from "@/lib/db";
import { pastEvents } from "@/lib/db/schema";
import { readActor } from "@/lib/actor";
import { PastEventCard } from "@/components/PastEventCard";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await cleanupExpiredEvents();

  const actor = await readActor();
  const rows = await db
    .select()
    .from(pastEvents)
    .orderBy(desc(pastEvents.endsAt))
    .limit(100);

  const myUsername =
    actor?.kind === "user" && actor.displayName
      ? actor.displayName.toLowerCase()
      : null;

  const myEvents = myUsername
    ? rows.filter(
        (e) =>
          e.hostName.toLowerCase() === myUsername ||
          e.attendeeUsernames.some((u) => u.toLowerCase() === myUsername) ||
          (e.maybeUsernames ?? []).some((u) => u.toLowerCase() === myUsername)
      )
    : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">My History</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Past dorm events archived after they ended.
        </p>
      </header>

      {myUsername ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
            @{myUsername}&apos;s Past Events
          </h2>
          {myEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
              You haven&apos;t hosted or attended any completed events yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {myEvents.map((e) => (
                <li key={e.id}>
                  <PastEventCard
                    event={{
                      ...e,
                      startsAt: new Date(e.startsAt),
                      endsAt: new Date(e.endsAt),
                    }}
                    roleLabel={
                      e.hostName.toLowerCase() === myUsername
                        ? "Hosted"
                        : "Attended"
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          All Past Events
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
            No past events archived yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((e) => (
              <li key={e.id}>
                <PastEventCard
                  event={{
                    ...e,
                    startsAt: new Date(e.startsAt),
                    endsAt: new Date(e.endsAt),
                  }}
                  roleLabel={
                    myUsername
                      ? e.hostName.toLowerCase() === myUsername
                        ? "Hosted"
                        : e.attendeeUsernames.some(
                              (u) => u.toLowerCase() === myUsername
                            )
                          ? "Attended"
                          : null
                      : null
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

