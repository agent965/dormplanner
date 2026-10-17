import { db } from "./index";
import { users, events, bringItems, rsvps, leftovers } from "./schema";
import { newId } from "../utils";
import { sql } from "drizzle-orm";

async function main() {
  const userId = "demo-" + newId();
  await db.insert(users).values({
    id: userId,
    email: `demo-${Date.now()}@uw.edu`,
    name: "Demo Husky",
    dormSlug: "lander",
    floor: "4",
  });

  const eventId = newId();
  await db.insert(events).values({
    id: eventId,
    title: "Dummy pizza night",
    description: "Rows for the DB tour. Delete me later.",
    hostId: userId,
    dormSlug: "lander",
    location: "4F lounge",
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    capacity: 20,
    openToAllDorms: false,
  });

  await db.insert(rsvps).values({
    id: newId(),
    eventId,
    userId,
    status: "yes",
    note: "Hosting",
  });

  const dummyItems = [
    { name: "2L coke", quantity: 2, tags: [] },
    { name: "Chips", quantity: 3, tags: ["vegetarian"] },
    { name: "Vegan ice cream", quantity: 1, tags: ["vegan", "dairy_free"] },
    { name: "Paper plates", quantity: 1, tags: [] },
  ] as const;

  for (const it of dummyItems) {
    await db.insert(bringItems).values({
      id: newId(),
      eventId,
      name: it.name,
      quantity: it.quantity,
      tags: [...it.tags],
      createdByName: "Demo Husky",
      createdById: userId,
    });
  }

  await db.insert(leftovers).values({
    id: newId(),
    eventId: null,
    postedById: userId,
    dormSlug: "lander",
    description: "6 slices of pepperoni pizza, come grab.",
    location: "Lander 403, door propped open",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  console.log("\nInserted dummy rows:");
  console.log("  users: +1 (Demo Husky, @uw.edu)");
  console.log("  events: +1 (Dummy pizza night)");
  console.log("  rsvps: +1");
  console.log("  bring_items: +4 (with dietary tags)");
  console.log("  leftovers: +1");

  const counts = await db.execute(sql`
    SELECT 'users' AS t, count(*)::int AS n FROM users UNION ALL
    SELECT 'events', count(*)::int FROM events UNION ALL
    SELECT 'rsvps', count(*)::int FROM rsvps UNION ALL
    SELECT 'bring_items', count(*)::int FROM bring_items UNION ALL
    SELECT 'leftovers', count(*)::int FROM leftovers UNION ALL
    SELECT 'dorms', count(*)::int FROM dorms
    ORDER BY t
  `);
  console.log("\nTotal row counts:");
  for (const r of counts.rows) {
    const row = r as { t: string; n: number };
    console.log(`  ${row.t.padEnd(14)} ${row.n}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
