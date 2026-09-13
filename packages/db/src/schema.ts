import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// ---------------------------------------------------------------------------
// Better Auth tables (https://www.better-auth.com/docs/adapters/drizzle)
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull().default(""),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  // Phone-first identity: users sign in with a WhatsApp OTP
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: integer("phone_number_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  ...timestamps,
});

export const sessions = sqliteTable("sessions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

export const accounts = sqliteTable("accounts", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});

export const verifications = sqliteTable("verifications", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Domain tables
// ---------------------------------------------------------------------------

/** A recurring prayer group, e.g. "Shacharis at the shul on Main". */
export const minyans = sqliteTable("minyans", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  locationText: text("location_text"),
  /** JSON WeeklySchedule: { weekdays: number[], time: "HH:MM" } */
  schedule: text("schedule").notNull(),
  /** How many attendees make a quorum (default 10). */
  quorumTarget: integer("quorum_target").notNull().default(10),
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

/** Follow ("regulars") — subscribe a user to a minyan's notifications. */
export const minyanFollowers = sqliteTable(
  "minyan_followers",
  {
    minyanId: text("minyan_id")
      .notNull()
      .references(() => minyans.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notifyQuorum: integer("notify_quorum", { mode: "boolean" })
      .notNull()
      .default(true),
    notifyReminders: integer("notify_reminders", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.minyanId, t.userId] })],
);

/** One dated occurrence of a minyan, materialized by the worker or created ad-hoc. */
export const events = sqliteTable(
  "events",
  {
    id: id(),
    /** Nullable: NULL means this is a one-off event (not tied to a recurring minyan). */
    minyanId: text("minyan_id").references(() => minyans.id, {
      onDelete: "cascade",
    }),
    /** Local calendar date, YYYY-MM-DD. */
    date: text("date").notNull(),
    /** Local datetime, ISO-like YYYY-MM-DDTHH:MM. */
    startsAt: text("starts_at").notNull(),
    /** Free-text location (e.g. "Shul on Main, downstairs"). */
    locationText: text("location_text"),
    /** Optional notes the organiser wants to share. */
    notes: text("notes"),
    /** Optional type tag for one-off events. */
    typeTag: text("type_tag", { enum: ["minyan", "pickup"] }),
    status: text("status", { enum: ["scheduled", "confirmed", "cancelled"] })
      .notNull()
      .default("scheduled"),
    /** Snapshot of the minyan's quorum target at materialization time. */
    quorumTarget: integer("quorum_target").notNull().default(10),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("events_minyan_date_uq").on(t.minyanId, t.date),
    index("events_owner_idx").on(t.ownerId),
  ],
);

export const rsvps = sqliteTable(
  "rsvps",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["in", "out"] }).notNull(),
    /** Where the RSVP came from: web UI, WhatsApp reply/button, or organizer. */
    source: text("source", { enum: ["web", "whatsapp", "organizer"] })
      .notNull()
      .default("web"),
    ...timestamps,
  },
  (t) => [uniqueIndex("rsvps_event_user_uq").on(t.eventId, t.userId)],
);

/** Outbound WhatsApp message log. Dedupe key prevents duplicate notifications. */
export const messages = sqliteTable(
  "messages",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventId: text("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    kind: text("kind", {
      enum: [
        "otp",
        "reminder",
        "quorum_reached",
        "quorum_lost",
        "rsvp_confirm",
        "custom",
      ],
    }).notNull(),
    /** e.g. `quorum_reached:<eventId>` — at most one message per key. */
    dedupeKey: text("dedupe_key"),
    waMessageId: text("wa_message_id"),
    status: text("status", { enum: ["queued", "sent", "failed"] })
      .notNull()
      .default("queued"),
    error: text("error"),
    /** JSON payload sent to the WhatsApp API (template params etc.). */
    payload: text("payload"),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("messages_dedupe_key_uq")
      .on(t.dedupeKey)
      .where(sql`dedupe_key is not null`),
    index("messages_user_idx").on(t.userId),
  ],
);

/** Durable job queue for the worker (reminders, materialization, deliveries). */
export const jobs = sqliteTable(
  "jobs",
  {
    id: id(),
    type: text("type").notNull(),
    /** JSON payload. */
    payload: text("payload").notNull().default("{}"),
    runAt: integer("run_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    status: text("status", { enum: ["pending", "processing", "done", "failed"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [index("jobs_status_run_at_idx").on(t.status, t.runAt)],
);
