import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

// drizzle-kit loads this config with its own runner, so node's --env-file flag
// does not apply. Read the workspace .env here instead. On Replit the env is
// already populated and the file simply does not exist.
const envFile = path.join(__dirname, "../../.env");

if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const schemaPath = path.join(__dirname, "./src/schema/index.ts");

// Relative on purpose: drizzle-kit resolves `out` against its own cwd and
// prefixes "./", which corrupts an absolute path. Every drizzle-kit command is
// run through this package's scripts, so cwd is always lib/db.
const outDir = "./drizzle";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Mirrors the driver choice in ./src/index.ts: a `file:` URL means the
// embedded PGlite database, anything else is a real Postgres server.
export default url.startsWith("file:")
  ? defineConfig({
      schema: schemaPath,
      out: outDir,
      dialect: "postgresql",
      driver: "pglite",
      dbCredentials: { url: url.replace(/^file:(\/\/)?/, "") },
    })
  : defineConfig({
      schema: schemaPath,
      out: outDir,
      dialect: "postgresql",
      dbCredentials: { url },
    });
