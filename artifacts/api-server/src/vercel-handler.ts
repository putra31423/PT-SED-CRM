/**
 * Entry point for the bundled Vercel function.
 *
 * build.mjs bundles this into api/[...path].mjs as a single self-contained
 * file. That indirection exists because @vercel/node only strips types from
 * the entry point — it does not compile or bundle what the entry point
 * imports. A plain `api/[...path].ts` that imported this app therefore shipped
 * an `import "../artifacts/api-server/src/app"` statement pointing at
 * TypeScript that was never compiled, and the function died on load with
 * either "Cannot find module" or "Cannot use import statement outside a
 * module", depending on the package type.
 *
 * Bundling first leaves Vercel a file with no imports left to resolve.
 */
import app from "./app";

export default app;
