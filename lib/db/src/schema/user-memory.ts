import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Persistent memory facts about the user.
 * Each row is a single fact (e.g. name, city, age).
 * Key is the unique identifier; upsert to update.
 */
export const userMemoryTable = pgTable("user_memory", {
  key: text("key").primaryKey(),       // e.g. "name", "city", "age"
  value: text("value").notNull(),      // e.g. "محمود", "الرياض", "25"
  label: text("label").notNull(),      // human-readable Arabic label
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserMemorySchema = createInsertSchema(userMemoryTable).omit({
  updatedAt: true,
});

export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;
export type UserMemory = typeof userMemoryTable.$inferSelect;
