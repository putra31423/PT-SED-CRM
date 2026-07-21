import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessUnitsTable } from "./businessUnits";

export const customersTable = pgTable("customers", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
