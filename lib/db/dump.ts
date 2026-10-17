import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  const u = await db.execute(sql`SELECT id, email, name, dorm_slug, floor FROM users`);
  const e = await db.execute(sql`SELECT id, title, host_id, dorm_slug, starts_at FROM events`);
  const b = await db.execute(sql`SELECT id, name, quantity, tags FROM bring_items`);

  console.log("\nUSERS:");
  console.table(u.rows);
  console.log("\nEVENTS:");
  console.table(e.rows);
  console.log("\nBRING_ITEMS:");
  console.table(b.rows);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
