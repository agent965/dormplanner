import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  const tables = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log("\nTables in public schema:");
  for (const r of tables.rows) console.log("  -", (r as { table_name: string }).table_name);

  const dormCount = await db.execute(sql`SELECT count(*)::int AS n FROM dorms`);
  console.log(`\nDorms seeded: ${(dormCount.rows[0] as { n: number }).n}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
