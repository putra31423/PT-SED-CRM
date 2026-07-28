import type { Request, Response } from "express";
import { DatabaseConfigurationError } from "@workspace/db";

interface ErrorWithCode extends Error {
  code?: string;
  cause?: unknown;
}

function errorChain(error: unknown): ErrorWithCode[] {
  const errors: ErrorWithCode[] = [];
  let current = error;

  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    errors.push(current as ErrorWithCode);
    current = (current as ErrorWithCode).cause;
  }

  return errors;
}

/**
 * Keeps route error responses consistent without exposing SQL or credentials.
 * PostgreSQL constraint errors are expected client errors, while deployment
 * configuration issues are reported as unavailable rather than a misleading
 * generic application failure.
 */
export function handleRouteError(
  req: Request,
  res: Response,
  error: unknown,
): void {
  const chain = errorChain(error);
  const configurationError = chain.find(
    (candidate) => candidate instanceof DatabaseConfigurationError,
  );

  if (configurationError) {
    req.log.error({ err: error }, "Database is not configured");
    res.status(503).json({
      error: configurationError.message,
      code: "DATABASE_UNAVAILABLE",
    });
    return;
  }

  const postgresError = chain.find(
    (candidate) => typeof candidate.code === "string",
  );
  const databaseErrorCodes = new Set([
    "28P01",
    "3D000",
    "53300",
    "57P01",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
  ]);

  if (
    postgresError?.code &&
    (postgresError.code.startsWith("08") ||
      databaseErrorCodes.has(postgresError.code))
  ) {
    req.log.error({ err: error }, "Database connection failed");
    res.status(503).json({
      error: "Database is temporarily unavailable",
      code: "DATABASE_UNAVAILABLE",
    });
    return;
  }

  switch (postgresError?.code) {
    case "23505":
      req.log.info({ err: error }, "Duplicate data rejected");
      res.status(409).json({ error: "Data already exists", code: "CONFLICT" });
      return;
    case "23503":
      req.log.info({ err: error }, "Referenced data rejected");
      res.status(409).json({
        error: "Data is still referenced by another record",
        code: "REFERENCE_CONFLICT",
      });
      return;
    case "23502":
    case "23514":
    case "22P02":
      req.log.info({ err: error }, "Invalid data rejected");
      res.status(400).json({ error: "Invalid data", code: "INVALID_INPUT" });
      return;
    default:
      req.log.error({ err: error }, "Unhandled route error");
      res.status(500).json({ error: "Internal server error" });
  }
}
