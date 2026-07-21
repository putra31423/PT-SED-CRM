import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessUnitsTable } from "./businessUnits";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  businessUnitId: integer("business_unit_id").references(() => businessUnitsTable.id),
  vendor: text("vendor"),
  category: text("category"),
  description: text("description"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 15, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method"),
  receiptNumber: text("receipt_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
