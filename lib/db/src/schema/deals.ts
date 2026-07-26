import { pgTable, serial, text, integer, numeric, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessUnitsTable } from "./businessUnits";
import { customersTable } from "./customers";

/**
 * An opportunity in the sales pipeline. `stage` drives the pipeline board and
 * is always single-valued (unlike customers.status), so it is safe to constrain.
 */
export const dealsTable = pgTable(
  "deals",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("deals_customer_id_idx").on(t.customerId),
    index("deals_business_unit_id_idx").on(t.businessUnitId),
    index("deals_stage_idx").on(t.stage),
    index("deals_expected_close_date_idx").on(t.expectedCloseDate),
    check(
      "deals_stage_valid",
      sql`${t.stage} IN ('Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')`,
    ),
    // Rendered as a percentage on the pipeline board.
    check(
      "deals_probability_range",
      sql`${t.probability} IS NULL OR (${t.probability} >= 0 AND ${t.probability} <= 100)`,
    ),
    check("deals_currency_iso4217", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
).enableRLS();

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
