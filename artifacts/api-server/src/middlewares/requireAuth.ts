import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify, errors } from "jose";

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
 * Deferring turns a missing SUPABASE_URL into a readable 500 on the routes
 * that actually need it.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;

  const supabaseUrl = process.env["SUPABASE_URL"];
  if (!supabaseUrl) {
    throw new Error(
      "SUPABASE_URL is not set. The API needs it to fetch the JWKS that " +
        "verifies access tokens. Set it to the project URL, e.g. " +
        "https://<project-ref>.supabase.co",
    );
  }

  jwks = createRemoteJWKSet(
    new URL(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/.well-known/jwks.json`),
  );
  return jwks;
}

function issuer() {
  return `${process.env["SUPABASE_URL"]!.replace(/\/+$/, "")}/auth/v1`;
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
    // Configuration, not credentials — 500 with the reason, so the cause is
    // visible in the response instead of only in the platform logs.
    req.log?.error({ err }, "Auth is not configured");
    res.status(500).json({ error: (err as Error).message });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, keys, { issuer: issuer() });

    // Supabase puts the user id in `sub`. Without it the token is not one of
    // ours, whatever else it may validly contain.
    if (typeof payload.sub !== "string") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    req.user = {
      id: payload.sub,
      email: typeof payload["email"] === "string" ? payload["email"] : undefined,
    };

    next();
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
  }
};
