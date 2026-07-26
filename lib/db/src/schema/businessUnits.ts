import { pgTable, serial, text, boolean, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * A line of business the company operates (Media, Tourism, ...).
 * Top of the hierarchy: customers, deals, income and expenses all point here,
 * so this table has no outgoing foreign keys of its own.
 */
export const businessUnitsTable = pgTable(
  "business_units",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    category: text("category").notNull(),
    website: text("website"),
    logoUrl: text("logo_url"),
    description: text("description"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("business_units_category_idx").on(t.category),
    index("business_units_is_active_idx").on(t.isActive),
    // Mirrors the enum in lib/api-spec/openapi.yaml. Safe to constrain: no page
    // ever joins multiple categories into one string.
    check(
      "business_units_category_valid",
      sql`${t.category} IN ('Media', 'Digital', 'Tourism', 'Luxury', 'Travel Support', 'Lifestyle', 'Service', 'Retail')`,
    ),
  ],
).enableRLS();

export const insertBusinessUnitSchema = createInsertSchema(businessUnitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusinessUnit = z.infer<typeof insertBusinessUnitSchema>;
export type BusinessUnit = typeof businessUnitsTable.$inferSelect;
