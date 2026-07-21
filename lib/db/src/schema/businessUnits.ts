import { pgTable, serial, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessUnitsTable = pgTable("business_units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  website: text("website"),
  logoUrl: text("logo_url"),
  description: text("description"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBusinessUnitSchema = createInsertSchema(businessUnitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusinessUnit = z.infer<typeof insertBusinessUnitSchema>;
export type BusinessUnit = typeof businessUnitsTable.$inferSelect;
