import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export * from "./schema";

/**
 * Query operators, re-exported so consumers never import drizzle-orm directly.
 *
 * pnpm resolves drizzle-orm once per peer-dependency context, so importing it
 * from two packages produced two distinct instances. TypeScript then treated
 * their types as unrelated and every `eq(...)` in a route failed with
 * "separate declarations of a private property 'shouldInlineParams'".
 *
 * Routing every consumer through this package guarantees a single instance.
 * Add operators here as they are needed rather than reaching past this module.
 */
export { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, like, lte, ne, not, or, sql } from "drizzle-orm";
