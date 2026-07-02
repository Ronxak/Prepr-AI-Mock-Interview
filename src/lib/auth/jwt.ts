import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Edge-safe JWT helpers (jose runs on the Edge runtime; bcrypt/Prisma do not).
 *
 * We read `process.env.JWT_SECRET` by *static* reference so Next inlines it into
 * the Edge middleware bundle. Importing lib/env.ts here would break middleware,
 * because Edge does not reliably expose the full process.env object to zod.
 */
const secretValue = process.env.JWT_SECRET;
if (!secretValue || secretValue.length < 16) {
  throw new Error("JWT_SECRET is missing or too short (min 16 chars).");
}
const secret = new TextEncoder().encode(secretValue);
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export interface SessionClaims extends JWTPayload {
  sub: string; // user id
  email: string;
  name: string;
}

export async function signSession(user: {
  id: string;
  email: string;
  name: string;
}): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(secret);
}

export async function verifySession(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return payload as SessionClaims;
  } catch {
    return null; // expired, tampered, or malformed
  }
}
