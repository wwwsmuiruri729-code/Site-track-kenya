import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const dailyReportsTable = pgTable("daily_reports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id),
  reportDate: date("report_date", { mode: "string" }).notNull(),
  weather: text("weather"),
  workersCount: integer("workers_count").notNull().default(0),
  workPerformed: text("work_performed").notNull(),
  issues: text("issues"),
  nextDayPlan: text("next_day_plan"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDailyReportSchema = createInsertSchema(dailyReportsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReportsTable.$inferSelect;
