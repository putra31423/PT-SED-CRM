import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let instance: NodePgDatabase<typeof schema> | null = null;
let pool: InstanceType<typeof Pool> | null = null;

export class DatabaseConfigurationError extends Error {
  readonly name = "DatabaseConfigurationError";
}

function connect(): NodePgDatabase<typeof schema> {
  if (instance) return instance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL is not set. On Vercel add it under Settings → " +
        "Environment Variables, using Supabase's Transaction pooler (port 6543).",
    );
  }

  pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

  // Vercel drains idle clients before freezing a function instance. Without
  // this lifecycle hook, warm instances can retain pooler slots until their
  // process is eventually recycled.
  if (process.env.VERCEL) {
    attachDatabasePool(pool);
  }

  instance = drizzle(pool, { schema });
  return instance;
}

/**
 * Connects on first use, not at import.
 *
 * Throwing at module scope kills a serverless function before it can answer
 * anything, and the platform reports only FUNCTION_INVOCATION_FAILED — with no
 * hint about which variable is missing, and every route down including
 * /api/healthz, which needs no database at all. Going through a proxy means a
 * missing DATABASE_URL surfaces as a readable error on the routes that query,
 * and leaves the rest of the API serving normally.
 */
export const db: NodePgDatabase<typeof schema> = new Proxy(
  {} as NodePgDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      const real = connect() as object;
      const value = Reflect.get(real, prop, receiver);
      return typeof value === "function" ? value.bind(real) : value;
    },
  },
);

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
export {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  ne,
  not,
  or,
  sql,
} from "drizzle-orm";
