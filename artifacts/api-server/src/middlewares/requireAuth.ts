import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify, errors, type JWTPayload } from "jose";
import { db, sql } from "@workspace/db";

/**
 * Rejects any request that does not carry a valid Supabase access token.
 *
 * Tokens are verified locally against Supabase's published JWKS (asymmetric
 * keys), not by calling the Auth API on every request. That keeps the check to
 * a signature verification with no network round-trip once the key set is
 * cached — which matters on serverless, where every cold start would otherwise
 * pay for an extra hop.
 *
 * `jose` caches the JWKS and refreshes it on its own; Supabase serves it with a
 * 10-minute cache lifetime.
 */

/**
 * Resolved on first request rather than at import.
 *
 * Throwing at module scope kills a serverless function before it can answer
 * anything, and the platform reports only FUNCTION_INVOCATION_FAILED — every
 * route, including /api/healthz, fails with no clue which variable is missing.
 * Deferring turns a missing SUPABASE_URL into a readable 503 on the routes
 * that actually need it.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getSupabaseUrl(): string {
  const value = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!value?.trim()) {
    throw new Error(
      "SUPABASE_URL is not set. The API needs it to verify access tokens.",
    );
  }

  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("SUPABASE_URL must use HTTPS outside localhost.");
  }

  return url.toString().replace(/\/+$/, "");
}

function getJwks() {
  if (jwks) return jwks;

  const supabaseUrl = getSupabaseUrl();

  jwks = createRemoteJWKSet(
    new URL(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/.well-known/jwks.json`),
  );
  return jwks;
}

function issuer() {
  return `${getSupabaseUrl()}/auth/v1`;
}

const accessCache = new Map<string, { allowed: boolean; expiresAt: number }>();
const pendingAccessChecks = new Map<string, Promise<boolean>>();

async function hasCrmAccess(userId: string): Promise<boolean> {
  const cached = accessCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.allowed;

  const pending = pendingAccessChecks.get(userId);
  if (pending) return pending;

  const check = db
    .execute<{ allowed: boolean }>(
      sql`
      SELECT EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = ${userId}::uuid
          AND deleted_at IS NULL
          AND (banned_until IS NULL OR banned_until < now())
          AND raw_app_meta_data @> '{"crm_access": true}'::jsonb
      ) AS allowed
    `,
    )
    .then((result) => {
      const allowed = result.rows[0]?.allowed === true;
      accessCache.set(userId, {
        allowed,
        expiresAt: Date.now() + (allowed ? 60_000 : 15_000),
      });
      return allowed;
    })
    .finally(() => pendingAccessChecks.delete(userId));

  pendingAccessChecks.set(userId, check);
  return check;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = readBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  let keys: ReturnType<typeof createRemoteJWKSet>;
  try {
    keys = getJwks();
  } catch (err) {
    // Configuration, not credentials — 503 with the reason, so the cause is
    // visible in the response instead of only in the platform logs.
    req.log?.error({ err }, "Auth is not configured");
    res.status(503).json({
      error: (err as Error).message,
      code: "AUTH_CONFIGURATION_ERROR",
    });
    return;
  }

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, keys, {
      issuer: issuer(),
      audience: "authenticated",
    }));

    // Supabase puts the user id in `sub`. The role and anonymous checks prevent
    // non-user project tokens from being treated as an authenticated staff
    // session even if their signature is otherwise valid.
    if (
      typeof payload.sub !== "string" ||
      payload.role !== "authenticated" ||
      payload.is_anonymous === true
    ) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
  } catch (err) {
    // Expiry is routine — a client simply needs to refresh. Anything else is
    // worth logging, because it may mean a misconfigured issuer or a forgery
    // attempt rather than an ordinary stale session.
    if (err instanceof errors.JWTExpired) {
      res.status(401).json({ error: "Token expired" });
      return;
    }

    req.log?.warn({ err }, "Access token rejected");
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  try {
    if (!(await hasCrmAccess(payload.sub as string))) {
      res.status(403).json({ error: "This account does not have CRM access" });
      return;
    }
  } catch (err) {
    req.log?.error({ err }, "CRM access check failed");
    res.status(503).json({
      error: "Authentication service is temporarily unavailable",
      code: "AUTHORIZATION_UNAVAILABLE",
    });
    return;
  }

  req.user = {
    id: payload.sub as string,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };

  next();
};
