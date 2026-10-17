import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Dropping all project tables...");
  await db.execute(sql`
    DROP TABLE IF EXISTS
      bring_items,
      rsvps,
      leftovers,
      events,
      dorms,
      accounts,
      sessions,
      verification_tokens,
      users,
      "__drizzle_migrations"
    CASCADE;
    DROP TYPE IF EXISTS rsvp_status;
    DROP TYPE IF EXISTS dietary_tag;
    DROP SCHEMA IF EXISTS drizzle CASCADE;
  `);
  console.log("Done. Now run: npm run db:generate && npm run db:migrate && npm run db:seed");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
