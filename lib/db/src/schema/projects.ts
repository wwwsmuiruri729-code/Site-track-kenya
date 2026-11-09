import { createInsertSchema } from "drizzle-zod";
import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  client: text("client").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default("active"),
  budget: numeric("budget", { precision: 14, scale: 2, mode: "number" }).notNull(),
  progress: integer("progress").notNull().default(0),
  startDate: date("start_date", { mode: "string" }),
  targetEndDate: date("target_end_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
