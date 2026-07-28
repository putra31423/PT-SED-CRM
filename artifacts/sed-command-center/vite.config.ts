import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ command, mode }) => {
  const rootEnvDir = path.resolve(import.meta.dirname, "..", "..");
  const env = { ...loadEnv(mode, rootEnvDir, ""), ...process.env };

  // PORT belongs to the Express API in the shared root .env. Reading it here
  // made Vite compete with the API on :5001. Use a frontend-specific override;
  // only inherit Replit's process-level PORT when actually running on Replit.
  const rawPort =
    env.FRONTEND_PORT ??
    (process.env.REPL_ID !== undefined ? process.env.PORT : undefined) ??
    "5173";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = env.BASE_PATH ?? "/";
  const apiTarget = env.API_URL ?? "http://127.0.0.1:5001";

  if (command === "build") {
    const required = [
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
    ] as const;
    const missing = required.filter((name) => !env[name]?.trim());

    if (missing.length > 0) {
      throw new Error(
        `Missing frontend environment variables: ${missing.join(", ")}. ` +
          "Set them in Vercel for the deployment environment, then redeploy.",
      );
    }

    const supabaseUrl = new URL(env.VITE_SUPABASE_URL!);
    if (
      supabaseUrl.protocol !== "https:" &&
      supabaseUrl.hostname !== "localhost"
    ) {
      throw new Error("VITE_SUPABASE_URL must use HTTPS outside localhost.");
    }
  }

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(mode !== "production" && env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    // The workspace keeps one .env at the repo root, shared with the API server,
    // so VITE_* variables live there rather than beside this config.
    envDir: rootEnvDir,
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          // The shadcn components carry a Next.js "use client" directive, which
          // means nothing in a Vite SPA. Rollup strips it and then cannot map the
          // notice back to a source line, printing a red "Error when using
          // sourcemap..." for eight files on every build. Nothing is wrong — the
          // build succeeds — but it reads like a failure in CI logs, so drop just
          // this one class and let every other warning through.
          if (
            warning.message.includes("Error when using sourcemap") ||
            warning.code === "MODULE_LEVEL_DIRECTIVE"
          ) {
            return;
          }
          defaultHandler(warning);
        },
      },
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
