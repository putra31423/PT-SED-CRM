import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./app";

/**
 * Entry point for the bundled Vercel function.
 *
 * build.mjs bundles this into api/index.js as a single self-contained file.
 * That indirection exists because @vercel/node only strips types from the entry
 * point — it neither compiles nor bundles what the entry imports — so a plain
 * TypeScript import shipped an unresolvable `import` and the function died on
 * load.
 *
 * Routing is explicit rather than convention-based. A catch-all filename
 * (api/[...path].js) was matching a single segment only: /api/business-units
 * reached the app while /api/dashboard/summary returned the platform's own 404
 * and never arrived. vercel.json now rewrites every /api/* request here and
 * passes the original path in `__p`, which this handler restores before Express
 * sees the request. Depending on the platform, `req.url` may already hold the
 * original path — that case is honoured first, and `__p` is the fallback.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const raw = req.url ?? "/";
  const url = new URL(raw, "http://localhost");
  const passthrough = url.searchParams.get("__p");

  if (passthrough !== null) {
    url.searchParams.delete("__p");
    const query = url.searchParams.toString();
    const path = passthrough.startsWith("/") ? passthrough : `/${passthrough}`;
    req.url = `/api${path}${query ? `?${query}` : ""}`;
  }

  return (app as unknown as (q: IncomingMessage, s: ServerResponse) => void)(req, res);
}
