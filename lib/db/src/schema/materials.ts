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
import { projectsTable } from "./projects";

export const materialDeliveriesTable = pgTable("material_deliveries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id),
  deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
  materialName: text("material_name").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3, mode: "number" }).notNull(),
  unit: text("unit").notNull(),
  supplier: text("supplier").notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2, mode: "number" }),
  receivedBy: text("received_by"),
  deliveryNote: text("delivery_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMaterialDeliverySchema = createInsertSchema(
  materialDeliveriesTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertMaterialDelivery = z.infer<typeof insertMaterialDeliverySchema>;
export type MaterialDelivery = typeof materialDeliveriesTable.$inferSelect;
