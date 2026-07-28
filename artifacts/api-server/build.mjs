import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

function validateDeploymentEnvironment() {
  if (!process.env.VERCEL) return;

  const required = ["DATABASE_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (!process.env.SUPABASE_URL?.trim() && !process.env.VITE_SUPABASE_URL?.trim()) {
    missing.push("SUPABASE_URL");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Vercel environment variables: ${[...new Set(missing)].join(", ")}. ` +
        "Configure them for this environment and redeploy.",
    );
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URI.");
  }
  if (
    databaseUrl.hostname.endsWith(".pooler.supabase.com") &&
    databaseUrl.port !== "6543"
  ) {
    throw new Error(
      "Vercel must use Supabase's Transaction pooler on port 6543, not the Session pooler.",
    );
  }

  if (
    process.env.SUPABASE_URL &&
    new URL(process.env.SUPABASE_URL).origin !==
      new URL(process.env.VITE_SUPABASE_URL).origin
  ) {
    throw new Error(
      "SUPABASE_URL and VITE_SUPABASE_URL must point to the same project.",
    );
  }
}

async function buildAll() {
  validateDeploymentEnvironment();
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });

  await buildVercelFunction();
}

/**
 * Bundles the same Express app into api/index.js for Vercel.
 *
 * @vercel/node only strips types from the entry point; it neither compiles nor
 * bundles what that entry imports. Handing it a TypeScript import therefore
 * produced a function that died on load. Bundling here leaves a single file
 * with nothing left to resolve.
 *
 * A plain filename, not a [...catch-all]: that convention only ever matched a
 * single segment here, so /api/dashboard/summary never reached the app.
 * vercel.json routes /api/* to this file explicitly instead. ESM comes from
 * `type: module` on the root package; the banner supplies `require` for the
 * CommonJS dependencies inside the bundle — pino reaches for require("tty").
 *
 * Written into api/ rather than dist/ because Vercel discovers functions from
 * that directory, and it runs buildCommand before collecting them.
 */
async function buildVercelFunction() {
  const outfile = path.resolve(artifactDir, "../../api/index.js");

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/vercel-handler.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    target: "node24",
    outfile,
    logLevel: "info",
    // The only true native binding here; everything else bundles cleanly.
    external: ["pg-native"],
    banner: {
      js: `import { createRequire as __cr } from 'node:module';
import __p from 'node:path';
import __u from 'node:url';

globalThis.require = __cr(import.meta.url);
globalThis.__filename = __u.fileURLToPath(import.meta.url);
globalThis.__dirname = __p.dirname(globalThis.__filename);
`,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
