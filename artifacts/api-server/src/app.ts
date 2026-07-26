import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import healthRouter from "./routes/health";
import { requireAuth } from "./middlewares/requireAuth";
import { logger } from "./lib/logger";

const app: Express = express();

// Browsers may only call this API from origins we name. Without a list the
// API stays same-origin only, which is what both the Vite dev proxy and the
// Vercel deployment use — there the frontend and /api share one origin.
const allowedOrigins = (process.env["CORS_ORIGIN"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Liveness check stays public so uptime monitors and platform health probes
// work without credentials. It exposes no data.
app.use("/api", healthRouter);

// Everything else requires a valid Supabase access token.
app.use("/api", requireAuth, router);

export default app;
