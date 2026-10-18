import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js loads .env.local automatically at runtime; drizzle-kit does not.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only manage our own tables — TigerData/TimescaleDB installs extension views
  // (pg_buffercache, etc.) in the public schema that drizzle-kit would otherwise
  // try to drop.
  tablesFilter: [
    "users",
    "accounts",
    "sessions",
    "verification_tokens",
    "dorms",
    "events",
    "past_events",
    "rsvps",
    "bring_items",
    "leftovers",
  ],
  verbose: true,
  strict: true,
});
