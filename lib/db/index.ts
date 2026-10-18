import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse the pool across hot reloads in dev.
const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  schemaSynced?: boolean;
  lastCleanupMs?: number;
};

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    // Vercel runs each request in its own Lambda — each has its own pool, so
    // keep max small or TigerData's connection cap gets blown by concurrent
    // invocations. 2 is plenty per instance.
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
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
  "planned_dishes" jsonb DEFAULT '[]'::jsonb NOT NULL,
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
ALTER TABLE IF EXISTS "past_events" ADD COLUMN IF NOT EXISTS "planned_dishes" jsonb DEFAULT '[]'::jsonb NOT NULL;
`;

const ensureFriendshipsSql = `
CREATE TABLE IF NOT EXISTS "friendships" (
  "id" text PRIMARY KEY NOT NULL,
  "requester_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "addressee_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL,
  "starred_by_requester" boolean DEFAULT false NOT NULL,
  "starred_by_addressee" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_uidx" ON "friendships" ("requester_id", "addressee_id");
CREATE INDEX IF NOT EXISTS "friendships_requester_idx" ON "friendships" ("requester_id");
CREATE INDEX IF NOT EXISTS "friendships_addressee_idx" ON "friendships" ("addressee_id");
`;

if (!globalForDb.schemaSynced) {
  globalForDb.schemaSynced = true;
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "tags" "dietary_tag"[] DEFAULT '{}' NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "planned_dishes" jsonb DEFAULT '[]'::jsonb NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "canceled" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "looking_for_dishwasher" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "looking_for_cook" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "looking_for_ingredients" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "looking_for_cookware" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "dishwasher_claimed_by_id" text;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "dishwasher_claimed_by_guest_id" text;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "dishwasher_claimed_by_name" text;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "cook_claimed_by_id" text;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "cook_claimed_by_guest_id" text;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "events" ADD COLUMN IF NOT EXISTS "cook_claimed_by_name" text;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "bring_items" ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "bring_items" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'Other' NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "bring_items" ADD COLUMN IF NOT EXISTS "absolutely_necessary" boolean DEFAULT false NOT NULL;`)
    .catch(() => {});
  pool
    .query(`ALTER TABLE IF EXISTS "rsvps" ADD COLUMN IF NOT EXISTS "fingerprint" text;`)
    .catch(() => {});
  // Profile fields
  pool.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "display_name" text;`).catch(() => {});
  pool.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "bio" text;`).catch(() => {});
  pool.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "major" text;`).catch(() => {});
  pool.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "campus" text;`).catch(() => {});
  pool.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "year" text;`).catch(() => {});
  pool.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "pronouns" text;`).catch(() => {});
  pool.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "avatar" text;`).catch(() => {});
  pool
    .query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "rsvps_event_fingerprint_uidx"
       ON "rsvps" ("event_id", "fingerprint")
       WHERE "fingerprint" IS NOT NULL AND "user_id" IS NULL;`
    )
    .catch(() => {});
  pool.query(ensurePastEventsSql).catch(() => {});
  pool.query(ensureFriendshipsSql).catch(() => {});
}

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };

let roleColumnsEnsured = false;
export async function ensureEventRoleColumns() {
  if (roleColumnsEnsured) return;
  try {
    await db.execute(sql`
      ALTER TABLE IF EXISTS "events"
        ADD COLUMN IF NOT EXISTS "looking_for_dishwasher" boolean DEFAULT false NOT NULL,
        ADD COLUMN IF NOT EXISTS "looking_for_cook" boolean DEFAULT false NOT NULL,
        ADD COLUMN IF NOT EXISTS "looking_for_ingredients" boolean DEFAULT false NOT NULL,
        ADD COLUMN IF NOT EXISTS "looking_for_cookware" boolean DEFAULT false NOT NULL,
        ADD COLUMN IF NOT EXISTS "dishwasher_claimed_by_id" text,
        ADD COLUMN IF NOT EXISTS "dishwasher_claimed_by_guest_id" text,
        ADD COLUMN IF NOT EXISTS "dishwasher_claimed_by_name" text,
        ADD COLUMN IF NOT EXISTS "cook_claimed_by_id" text,
        ADD COLUMN IF NOT EXISTS "cook_claimed_by_guest_id" text,
        ADD COLUMN IF NOT EXISTS "cook_claimed_by_name" text;
    `);
    await db.execute(sql`
      ALTER TABLE IF EXISTS "bring_items"
        ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'Other' NOT NULL,
        ADD COLUMN IF NOT EXISTS "absolutely_necessary" boolean DEFAULT false NOT NULL;
    `);
    roleColumnsEnsured = true;
  } catch {
    // ignore if table does not exist yet
  }
}

export async function syncEventNecessaryTags(eventId: string) {
  await ensureEventRoleColumns();
  const rows = await db
    .select({
      category: schema.bringItems.category,
      absolutelyNecessary: schema.bringItems.absolutelyNecessary,
      approved: schema.bringItems.approved,
      claimedById: schema.bringItems.claimedById,
      claimedByGuestId: schema.bringItems.claimedByGuestId,
    })
    .from(schema.bringItems)
    .where(sql`${schema.bringItems.eventId} = ${eventId}`);

  const necIngredients = rows.filter(
    (r) => r.approved && r.absolutelyNecessary && r.category === "Ingredients"
  );
  const necCookware = rows.filter(
    (r) => r.approved && r.absolutelyNecessary && r.category === "Cookware/Utensils"
  );

  const updates: {
    lookingForIngredients?: boolean;
    lookingForCookware?: boolean;
  } = {};

  if (necIngredients.length > 0) {
    const allClaimed = necIngredients.every(
      (r) => Boolean(r.claimedById || r.claimedByGuestId)
    );
    updates.lookingForIngredients = !allClaimed;
  }

  if (necCookware.length > 0) {
    const allClaimed = necCookware.every(
      (r) => Boolean(r.claimedById || r.claimedByGuestId)
    );
    updates.lookingForCookware = !allClaimed;
  }

  if (
    updates.lookingForIngredients !== undefined ||
    updates.lookingForCookware !== undefined
  ) {
    await db
      .update(schema.events)
      .set(updates)
      .where(sql`${schema.events.id} = ${eventId}`);
  }
}

export async function cleanupExpiredEvents() {
  // Throttle: at most once per 2 minutes per process. Prevents hammering
  // TigerData's connection pool on every page load.
  const now = Date.now();
  if (globalForDb.lastCleanupMs && now - globalForDb.lastCleanupMs < 120_000) {
    return;
  }
  globalForDb.lastCleanupMs = now;

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
      "planned_dishes",
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
      COALESCE(e.planned_dishes, '[]'::jsonb),
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

