/**
 * Vercel serverless entry point for the Express API.
 *
 * The catch-all filename means every request under /api/* lands here with its
 * original URL intact, so the router mounted at `app.use("/api", ...)` in
 * artifacts/api-server/src/app.ts matches exactly as it does locally.
 *
 * This file deliberately contains no logic. `app.ts` builds the Express app but
 * never listens; artifacts/api-server/src/index.ts adds the `listen()` call for
 * local development and any long-lived host. Both entry points therefore share
 * one identical application — there is no serverless-only code path to drift.
 */
import app from "../artifacts/api-server/src/app";

export default app;
