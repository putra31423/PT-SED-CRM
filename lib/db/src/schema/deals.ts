import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessUnitsTable } from "./businessUnits";
import { customersTable } from "./customers";

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("Lead"),
  value: numeric("value", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("IDR"),
  customerId: integer("customer_id").references(() => customersTable.id),
  businessUnitId: integer("business_unit_id").references(() => businessUnitsTable.id),
  assignedStaff: text("assigned_staff"),
  description: text("description"),
  expectedCloseDate: text("expected_close_date"),
  probability: integer("probability"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
