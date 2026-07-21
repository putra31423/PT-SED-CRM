import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessUnitsTable } from "./businessUnits";
import { customersTable } from "./customers";

export const incomeTable = pgTable("income", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  businessUnitId: integer("business_unit_id").references(() => businessUnitsTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  category: text("category"),
  description: text("description"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 15, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method"),
  invoiceNumber: text("invoice_number"),
  status: text("status").notNull().default("Received"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIncomeSchema = createInsertSchema(incomeTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomeTable.$inferSelect;
