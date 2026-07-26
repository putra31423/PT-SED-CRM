import { pgTable, serial, text, integer, numeric, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessUnitsTable } from "./businessUnits";
import { customersTable } from "./customers";

/**
 * Money coming in. Mirrors `expenses` — the two are summed against each other
 * for the profit-and-loss and cashflow reports.
 *
 * `amount` and `tax` are numeric(15,2); node-postgres returns those as STRINGS,
 * so callers must convert before doing arithmetic.
 */
export const incomeTable = pgTable(
  "income",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("income_business_unit_id_idx").on(t.businessUnitId),
    index("income_customer_id_idx").on(t.customerId),
    index("income_date_idx").on(t.date),
    index("income_status_idx").on(t.status),
    index("income_category_idx").on(t.category),
    check(
      "income_status_valid",
      sql`${t.status} IN ('Pending', 'Received', 'Cancelled')`,
    ),
  ],
).enableRLS();

export const insertIncomeSchema = createInsertSchema(incomeTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomeTable.$inferSelect;
