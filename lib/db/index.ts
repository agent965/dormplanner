import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
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

const ensurePastEventsSql = `
CREATE TABLE IF NOT EXISTS "past_events" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "host_id" text,
  "host_name" text NOT NULL,
  "dorm_slug" text,
  "location" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "capacity" integer,
  "tags" "dietary_tag"[] DEFAULT '{}' NOT NULL,
  "open_to_all_dorms" boolean DEFAULT false NOT NULL,
  "rsvp_yes_count" integer DEFAULT 0 NOT NULL,
  "attendee_usernames" text[] DEFAULT '{}' NOT NULL,
  "attendee_names" text[] DEFAULT '{}' NOT NULL,
  "maybe_usernames" text[] DEFAULT '{}' NOT NULL,
  "maybe_names" text[] DEFAULT '{}' NOT NULL,
  "archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE IF EXISTS "past_events" ADD COLUMN IF NOT EXISTS "maybe_usernames" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE IF EXISTS "past_events" ADD COLUMN IF NOT EXISTS "maybe_names" text[] DEFAULT '{}' NOT NULL;
`;

if (!globalForDb.schemaSynced) {
  globalForDb.schemaSynced = true;
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "tags" "dietary_tag"[] DEFAULT '{}' NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "canceled" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "bring_items" ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "rsvps" ADD COLUMN IF NOT EXISTS "fingerprint" text;`)
    .catch(() => {});
  pool
    .query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "rsvps_event_fingerprint_uidx"
       ON "rsvps" ("event_id", "fingerprint")
       WHERE "fingerprint" IS NOT NULL AND "user_id" IS NULL;`
    )
    .catch(() => {});
  pool.query(ensurePastEventsSql).catch(() => {});
}

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };

export async function cleanupExpiredEvents() {
  await db.execute(sql.raw(ensurePastEventsSql));

  // Archive ended events that were NOT manually deleted/canceled by the host
  await db.execute(sql`
    INSERT INTO "past_events" (
      "id",
      "title",
      "description",
      "host_id",
      "host_name",
      "dorm_slug",
      "location",
      "starts_at",
      "ends_at",
      "capacity",
      "tags",
      "open_to_all_dorms",
      "rsvp_yes_count",
      "attendee_usernames",
      "attendee_names",
      "maybe_usernames",
      "maybe_names"
    )
    SELECT
      e.id,
      e.title,
      e.description,
      e.host_id,
      COALESCE(u.username, 'someone'),
      e.dorm_slug,
      e.location,
      e.starts_at,
      COALESCE(e.ends_at, e.starts_at + interval '2 hours'),
      e.capacity,
      e.tags,
      e.open_to_all_dorms,
      (
        SELECT count(*)::int FROM rsvps r
        WHERE r.event_id = e.id AND r.status = 'yes'
      ),
      COALESCE(
        ARRAY(
          SELECT DISTINCT ru.username
          FROM rsvps r
          JOIN users ru ON r.user_id = ru.id
          WHERE r.event_id = e.id AND r.status = 'yes' AND ru.username IS NOT NULL
        ),
        '{}'::text[]
      ),
      COALESCE(
        ARRAY(
          SELECT COALESCE(ru.username, r.guest_name, 'someone')
          FROM rsvps r
          LEFT JOIN users ru ON r.user_id = ru.id
          WHERE r.event_id = e.id AND r.status = 'yes'
          ORDER BY r.updated_at DESC
        ),
        '{}'::text[]
      ),
      COALESCE(
        ARRAY(
          SELECT DISTINCT ru.username
          FROM rsvps r
          JOIN users ru ON r.user_id = ru.id
          WHERE r.event_id = e.id AND r.status = 'maybe' AND ru.username IS NOT NULL
        ),
        '{}'::text[]
      ),
      COALESCE(
        ARRAY(
          SELECT COALESCE(ru.username, r.guest_name, 'someone')
          FROM rsvps r
          LEFT JOIN users ru ON r.user_id = ru.id
          WHERE r.event_id = e.id AND r.status = 'maybe'
          ORDER BY r.updated_at DESC
        ),
        '{}'::text[]
      )
    FROM events e
    LEFT JOIN users u ON e.host_id = u.id
    WHERE COALESCE(e.ends_at, e.starts_at + interval '2 hours') <= now()
      AND e.canceled = false
    ON CONFLICT ("id") DO NOTHING
  `);

  // Delete all ended events (both archived ones and canceled ones)
  await db
    .delete(schema.events)
    .where(
      sql`COALESCE(${schema.events.endsAt}, ${schema.events.startsAt} + interval '2 hours') <= now()`
    );
}

