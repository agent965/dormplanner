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
    console.error("No users yet. Sign in once at /signin, then re-run this.");
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
      items: [
        { name: "2L of coke", quantity: 2, tags: [] },
        { name: "Chips & dip", quantity: 2, tags: ["vegetarian"] as const },
        { name: "Veggie platter", quantity: 1, tags: ["vegan", "gluten_free"] as const },
        { name: "Cupcakes", quantity: 12, tags: ["vegetarian"] as const },
        { name: "Paper plates", quantity: 1, tags: [] },
      ],
    },
    {
      title: "Sunday study break",
      description: "20 min break with snacks before midterms. Come decompress.",
      startsAt: in2h,
      location: "3F study room",
      capacity: 15,
      items: [
        { name: "Coffee carafe", quantity: 1, tags: [] },
        { name: "Donuts", quantity: 12, tags: ["vegetarian"] as const },
      ],
    },
    {
      title: "Pad thai cooking night",
      description: "We cook, you bring ingredients. Vegan option available.",
      startsAt: friday,
      location: "Lander kitchen",
      capacity: 10,
      items: [
        { name: "Rice noodles", quantity: 2, tags: ["gluten_free", "vegan"] as const },
        { name: "Peanuts", quantity: 1, tags: ["vegan"] as const },
        { name: "Lime", quantity: 6, tags: ["vegan"] as const },
        { name: "Tofu", quantity: 2, tags: ["vegan"] as const },
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
        tags: [...it.tags],
        createdByName: me.name ?? "Host",
        createdById: me.id,
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
