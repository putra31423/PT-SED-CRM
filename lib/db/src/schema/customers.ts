import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessUnitsTable } from "./businessUnits";

/**
 * A lead or client. `customerId` is the human-facing code (e.g. SED-0001);
 * `id` is the surrogate key every other table references.
 *
 * NOTE ON `status`: deliberately left WITHOUT a CHECK constraint. The customer
 * detail page writes a comma-joined list ("Lead,VIP") rather than a single
 * value — see artifacts/sed-command-center/src/pages/customer-detail.tsx — and
 * the API matches it with ILIKE '%...%'. An enum CHECK here would reject data
 * the app legitimately produces today. Add one only once status becomes
 * single-valued, or normalise it into a customer_statuses join table.
 */
export const customersTable = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    customerId: text("customer_id").notNull().unique(),
    fullName: text("full_name").notNull(),
    businessName: text("business_name"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    nationality: text("nationality"),
    country: text("country"),
    address: text("address"),
    businessUnitId: integer("business_unit_id").references(() => businessUnitsTable.id),
    serviceInterested: text("service_interested"),
    leadSource: text("lead_source"),
    facebook: text("facebook"),
    instagram: text("instagram"),
    website: text("website"),
    notes: text("notes"),
    status: text("status").notNull().default("Lead"),
    lastContact: text("last_contact"),
    nextFollowUp: text("next_follow_up"),
    assignedStaff: text("assigned_staff"),
    tags: text("tags"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Joined and filtered on in every list query in routes/customers.ts
    index("customers_business_unit_id_idx").on(t.businessUnitId),
    index("customers_status_idx").on(t.status),
    index("customers_next_follow_up_idx").on(t.nextFollowUp),
    index("customers_created_at_idx").on(t.createdAt),
    // The list endpoint also searches full_name, email, phone and business_name
    // with ILIKE '%term%', which no b-tree can serve. Those need trigram GIN
    // indexes, but they depend on pg_trgm, which PGlite (used for local dev)
    // does not ship. Declaring them here would make this migration fail on
    // every developer machine, so they live in the Postgres-only script
    // lib/db/drizzle/postgres-only/001_trigram_search_indexes.sql instead.
    // They are performance-only — query results are identical without them.
  ],
).enableRLS();

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
