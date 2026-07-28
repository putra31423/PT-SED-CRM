import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  // The commit is echoed alongside the schema-validated body so a deploy can be
  // identified from the outside. Without it there was no way to tell a live
  // build from a stale one, and several rounds of debugging were spent testing
  // a deployment that predated the fix. Vercel injects VERCEL_GIT_COMMIT_SHA.
  res.json({
    ...data,
    build: process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 7) ?? "local",
  });
});

export default router;
