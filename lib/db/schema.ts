import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export type PlannedDish = {
  name: string;
  imageUrl?: string | null;
  link?: string | null;
};

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

// Users — simple username + bcrypt password (no OAuth)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  dormSlug: text("dorm_slug"),
  floor: text("floor"),
  // Profile fields (all optional)
  displayName: text("display_name"),
  bio: text("bio"),
  major: text("major"),
  campus: text("campus"),
  year: text("year"),
  pronouns: text("pronouns"),
  avatar: text("avatar"), // base64 data URL (resized client-side)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
    tags: dietaryTag("tags").array().notNull().default([]),
    plannedDishes: jsonb("planned_dishes").$type<PlannedDish[]>().notNull().default([]),
    lookingForDishwasher: boolean("looking_for_dishwasher").notNull().default(false),
    lookingForCook: boolean("looking_for_cook").notNull().default(false),
    lookingForIngredients: boolean("looking_for_ingredients").notNull().default(false),
    lookingForCookware: boolean("looking_for_cookware").notNull().default(false),
    dishwasherClaimedById: text("dishwasher_claimed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    dishwasherClaimedByGuestId: text("dishwasher_claimed_by_guest_id"),
    dishwasherClaimedByName: text("dishwasher_claimed_by_name"),
    cookClaimedById: text("cook_claimed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    cookClaimedByGuestId: text("cook_claimed_by_guest_id"),
    cookClaimedByName: text("cook_claimed_by_name"),
    openToAllDorms: boolean("open_to_all_dorms").notNull().default(false),
    // "public" (default) or "friends" (visible only to host + host's friends)
    visibility: text("visibility").notNull().default("public"),
    canceled: boolean("canceled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_dorm_idx").on(t.dormSlug),
    index("events_starts_at_idx").on(t.startsAt),
  ]
);

// Past Events — archived into TigerData when an event ends naturally (not canceled)
export const pastEvents = pgTable(
  "past_events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    hostId: text("host_id"),
    hostName: text("host_name").notNull(),
    dormSlug: text("dorm_slug"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    capacity: integer("capacity"),
    tags: dietaryTag("tags").array().notNull().default([]),
    plannedDishes: jsonb("planned_dishes").$type<PlannedDish[]>().notNull().default([]),
    openToAllDorms: boolean("open_to_all_dorms").notNull().default(false),
    rsvpYesCount: integer("rsvp_yes_count").notNull().default(0),
    attendeeUsernames: text("attendee_usernames").array().notNull().default([]),
    attendeeNames: text("attendee_names").array().notNull().default([]),
    maybeUsernames: text("maybe_usernames").array().notNull().default([]),
    maybeNames: text("maybe_names").array().notNull().default([]),
    archivedAt: timestamp("archived_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("past_events_host_name_idx").on(t.hostName),
    index("past_events_ends_at_idx").on(t.endsAt),
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
    // Browser fingerprint — survives cookie clearing, blocks casual re-RSVP
    fingerprint: text("fingerprint"),
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
    uniqueIndex("rsvps_event_fingerprint_uidx")
      .on(t.eventId, t.fingerprint)
      .where(sql`${t.fingerprint} IS NOT NULL AND ${t.userId} IS NULL`),
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
    category: text("category").notNull().default("Other"),
    absolutelyNecessary: boolean("absolutely_necessary").notNull().default(false),
    note: text("note"),
    createdByName: text("created_by_name").notNull(),
    createdById: text("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByGuestId: text("created_by_guest_id"),
    claimedByName: text("claimed_by_name"),
    claimedById: text("claimed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    claimedByGuestId: text("claimed_by_guest_id"),
    // Host approval: true for host-added items, false for guest/non-host suggestions
    approved: boolean("approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bring_items_event_idx").on(t.eventId)]
);

// Leftovers board
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

// Friendships & friend requests
export const friendships = pgTable(
  "friendships",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: text("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // "pending" | "accepted"
    starredByRequester: boolean("starred_by_requester").notNull().default(false),
    starredByAddressee: boolean("starred_by_addressee").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("friendships_pair_uidx").on(t.requesterId, t.addresseeId),
    index("friendships_requester_idx").on(t.requesterId),
    index("friendships_addressee_idx").on(t.addresseeId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  hostedEvents: many(events),
  rsvps: many(rsvps),
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
