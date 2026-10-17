import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const rsvpStatus = pgEnum("rsvp_status", ["yes", "maybe", "no"]);

export const dietaryTag = pgEnum("dietary_tag", [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "halal",
  "kosher",
  "contains_pork",
  "contains_alcohol",
]);

// Users (populated by Auth.js on first sign-in)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  name: text("name"),
  image: text("image"),
  dormSlug: text("dorm_slug"),
  floor: text("floor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Auth.js tables
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// Dorms (seeded)
export const dorms = pgTable("dorms", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  area: text("area"),
});

// Events
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    hostId: text("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dormSlug: text("dorm_slug").references(() => dorms.slug),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    capacity: integer("capacity"),
    openToAllDorms: boolean("open_to_all_dorms").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_dorm_idx").on(t.dormSlug),
    index("events_starts_at_idx").on(t.startsAt),
  ]
);

// RSVPs — either a signed-in user OR a guest (cookie + typed name)
export const rsvps = pgTable(
  "rsvps",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestId: text("guest_id"),
    guestName: text("guest_name"),
    status: rsvpStatus("status").notNull(),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rsvps_event_user_uidx")
      .on(t.eventId, t.userId)
      .where(sql`${t.userId} IS NOT NULL`),
    uniqueIndex("rsvps_event_guest_uidx")
      .on(t.eventId, t.guestId)
      .where(sql`${t.guestId} IS NOT NULL`),
  ]
);

// Collaborative "what to bring" list — created/claimed by user OR guest
export const bringItems = pgTable(
  "bring_items",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    tags: dietaryTag("tags").array().notNull().default([]),
    note: text("note"),
    // Who created it — display name always stored, plus one of user/guest identity
    createdByName: text("created_by_name").notNull(),
    createdById: text("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByGuestId: text("created_by_guest_id"),
    // Who claimed it (nullable — nobody until claimed)
    claimedByName: text("claimed_by_name"),
    claimedById: text("claimed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    claimedByGuestId: text("claimed_by_guest_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bring_items_event_idx").on(t.eventId)]
);

// Leftovers board (post-event or ad-hoc "free food" posts)
export const leftovers = pgTable(
  "leftovers",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
    postedById: text("posted_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dormSlug: text("dorm_slug").references(() => dorms.slug),
    description: text("description").notNull(),
    location: text("location").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimed: boolean("claimed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leftovers_dorm_idx").on(t.dormSlug)]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  hostedEvents: many(events),
  rsvps: many(rsvps),
  bringItems: many(bringItems),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(users, { fields: [events.hostId], references: [users.id] }),
  dorm: one(dorms, { fields: [events.dormSlug], references: [dorms.slug] }),
  rsvps: many(rsvps),
  bringItems: many(bringItems),
}));

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  event: one(events, { fields: [rsvps.eventId], references: [events.id] }),
  user: one(users, { fields: [rsvps.userId], references: [users.id] }),
}));

export const bringItemsRelations = relations(bringItems, ({ one }) => ({
  event: one(events, { fields: [bringItems.eventId], references: [events.id] }),
}));

export type DietaryTag = (typeof dietaryTag.enumValues)[number];
export type RsvpStatus = (typeof rsvpStatus.enumValues)[number];
