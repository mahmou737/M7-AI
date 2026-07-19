import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Persistent memory facts about the user, scoped by Firebase UID.
 * Each row is a single fact (e.g. name, city, age).
 * Composite PK: (user_id, key) — each user has their own facts.
 */
export const userMemoryTable = pgTable(
  "user_memory",
  {
    userId: text("user_id").notNull().default("anonymous"),
    key: text("key").notNull(),       // e.g. "name", "city"
    value: text("value").notNull(),   // e.g. "محمود", "الرياض"
    label: text("label").notNull(),   // Arabic label
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.key] }),
  ]
);

export const insertUserMemorySchema = createInsertSchema(userMemoryTable).omit({
  updatedAt: true,
});

export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;
export type UserMemory = typeof userMemoryTable.$inferSelect;
