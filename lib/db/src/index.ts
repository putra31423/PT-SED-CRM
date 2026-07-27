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

const url = process.env.DATABASE_URL;

// A `file:` URL runs PGlite — Postgres compiled to WASM, embedded in this
// process and persisted to a local directory. It needs no server, so local
// development works without Docker or a hosted database. Every other URL is a
// regular Postgres connection string (Supabase, Replit, ...).
export const isEmbedded = url.startsWith("file:");

export const pool = isEmbedded ? null : new Pool({ connectionString: url });

// PGlite is imported dynamically, never statically. It ships tens of megabytes
// of WebAssembly that a serverless deployment would bundle and never use — big
// enough to break the Vercel function size limit. Production always takes the
// node-postgres branch, so the WASM is only ever loaded on a developer machine.
async function createDb(): Promise<NodePgDatabase<typeof schema>> {
  if (!isEmbedded) return drizzle(pool!, { schema });

  const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
  ]);

  return drizzlePglite(new PGlite(url.replace(/^file:(\/\/)?/, "")), {
    schema,
  }) as unknown as NodePgDatabase<typeof schema>;
}

// Top-level await keeps the exported `db` a plain value, so no call site has to
// change. Both entry points (the long-lived server and the serverless handler)
// are ESM, where this is resolved before any handler runs.
export const db: NodePgDatabase<typeof schema> = await createDb();

export * from "./schema";

/**
 * Query operators, re-exported so consumers never import drizzle-orm directly.
 *
 * pnpm resolves drizzle-orm once per peer-dependency context, and this package
 * pulls in @electric-sql/pglite while the API server does not — so importing
 * drizzle-orm from both produced two distinct instances. TypeScript then treats
 * their types as unrelated, and every `eq(...)` in a route failed with
 * "separate declarations of a private property 'shouldInlineParams'". It only
 * surfaced on Vercel, whose compiler resolves both copies at once.
 *
 * Routing every consumer through this package guarantees a single instance.
 * Add operators here as they are needed rather than reaching past this module.
 */
export { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, like, lte, ne, not, or, sql } from "drizzle-orm";
