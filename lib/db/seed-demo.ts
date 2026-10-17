import { db } from "./index";
import { bringItems, events, rsvps, users } from "./schema";
import { newId } from "../utils";
import { eq } from "drizzle-orm";

/**
 * Seed a few demo events + a bring-list, attributed to the first signed-in user.
 * Run AFTER signing in once: `npm run db:seed-demo`
 */
async function main() {
  const [me] = await db.select().from(users).limit(1);
  if (!me) {
    console.error("No users yet. Create an account at /signup, then re-run this.");
    process.exit(1);
  }

  const now = new Date();
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(19, 0, 0, 0);
  const friday = new Date(now);
  friday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7));
  friday.setHours(20, 0, 0, 0);

  const demoEvents = [
    {
      title: "Floor pizza party",
      description: "Pies showing up at 7. Bring sides + drinks via the list below.",
      startsAt: tomorrow,
      location: "4F lounge",
      capacity: 25,
      tags: ["vegetarian", "vegan", "gluten_free"] as const,
      items: [
        { name: "2L of coke", quantity: 2 },
        { name: "Chips & dip", quantity: 2 },
        { name: "Veggie platter", quantity: 1 },
        { name: "Cupcakes", quantity: 12 },
        { name: "Paper plates", quantity: 1 },
      ],
    },
    {
      title: "Sunday study break",
      description: "20 min break with snacks before midterms. Come decompress.",
      startsAt: in2h,
      location: "3F study room",
      capacity: 15,
      tags: ["vegetarian"] as const,
      items: [
        { name: "Coffee carafe", quantity: 1 },
        { name: "Donuts", quantity: 12 },
      ],
    },
    {
      title: "Pad thai cooking night",
      description: "We cook, you bring ingredients. Vegan option available.",
      startsAt: friday,
      location: "Lander kitchen",
      capacity: 10,
      tags: ["vegan", "gluten_free"] as const,
      items: [
        { name: "Rice noodles", quantity: 2 },
        { name: "Peanuts", quantity: 1 },
        { name: "Lime", quantity: 6 },
        { name: "Tofu", quantity: 2 },
      ],
    },
  ];

  for (const ev of demoEvents) {
    const eventId = newId();
    await db.insert(events).values({
      id: eventId,
      title: ev.title,
      description: ev.description,
      hostId: me.id,
      dormSlug: me.dormSlug ?? "lander",
      location: ev.location,
      startsAt: ev.startsAt,
      capacity: ev.capacity,
      tags: [...ev.tags],
      openToAllDorms: false,
    });

    await db
      .insert(rsvps)
      .values({ id: newId(), eventId, userId: me.id, status: "yes" })
      .onConflictDoNothing();

    for (const it of ev.items) {
      await db.insert(bringItems).values({
        id: newId(),
        eventId,
        name: it.name,
        quantity: it.quantity,
        createdByName: me.username,
        createdById: me.id,
        approved: true,
      });
    }
    console.log(`✓ Created "${ev.title}"`);
  }

  console.log("Demo seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
