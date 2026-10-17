import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse the pool across hot reloads in dev.
const globalForDb = globalThis as unknown as { pgPool?: Pool; schemaSynced?: boolean };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

if (!globalForDb.schemaSynced) {
  globalForDb.schemaSynced = true;
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "tags" "dietary_tag"[] DEFAULT '{}' NOT NULL;`)
    .catch(() => {});
}

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
