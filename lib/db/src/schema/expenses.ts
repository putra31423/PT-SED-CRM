import { pgTable, serial, text, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessUnitsTable } from "./businessUnits";

/**
 * Money going out. Mirrors `income`; unlike income it has no status workflow
 * and no customer link — an expense belongs to a business unit and a vendor.
 *
 * `amount` and `tax` are numeric(15,2); node-postgres returns those as STRINGS,
 * so callers must convert before doing arithmetic.
 */
export const expensesTable = pgTable(
  "expenses",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("expenses_business_unit_id_idx").on(t.businessUnitId),
    index("expenses_date_idx").on(t.date),
    index("expenses_category_idx").on(t.category),
    index("expenses_vendor_idx").on(t.vendor),
  ],
).enableRLS();

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
