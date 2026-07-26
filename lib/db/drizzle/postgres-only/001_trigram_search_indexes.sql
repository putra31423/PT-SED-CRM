-- Trigram search indexes — REAL POSTGRES ONLY (Supabase). Not part of the
-- Drizzle migration chain.
--
-- WHY THIS IS NOT IN THE DRIZZLE SCHEMA
-- The customer list endpoint (artifacts/api-server/src/routes/customers.ts)
-- searches four columns with ILIKE '%term%'. A leading wildcard cannot use a
-- b-tree index, so these need GIN + gin_trgm_ops from the pg_trgm extension.
-- Local development runs on PGlite, which does not ship pg_trgm — declaring
-- these in lib/db/src/schema/customers.ts made `drizzle-kit migrate` fail on
-- every developer machine with:
--     operator class "gin_trgm_ops" does not exist for access method "gin"
--
-- These indexes are PERFORMANCE ONLY. Query results are byte-identical without
-- them, so local development is unaffected by their absence.
--
-- HOW TO APPLY
-- Already applied to the PT SED CRM DATABASE Supabase project. Re-run this
-- against any new Postgres environment (staging, a client's own project):
--     psql "$DATABASE_URL" -f lib/db/drizzle/postgres-only/001_trigram_search_indexes.sql
--
-- MAINTENANCE WARNING
-- `drizzle-kit push` does not know about these and will DROP them, because it
-- diffs the live database against the TypeScript schema. Use
-- `pnpm --filter @workspace/db run migrate` instead — it only ever applies
-- forward migrations and never drops objects it does not recognise.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS customers_full_name_trgm_idx
  ON customers USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_email_trgm_idx
  ON customers USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_phone_trgm_idx
  ON customers USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_business_name_trgm_idx
  ON customers USING gin (business_name gin_trgm_ops);
