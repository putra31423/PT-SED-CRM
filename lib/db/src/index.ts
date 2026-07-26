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
