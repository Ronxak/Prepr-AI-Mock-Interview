import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { signSession, verifySession } from "@/lib/auth/jwt";
import type { PublicUser } from "@/types/user";

export const SESSION_COOKIE = "mi_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Issue a session cookie for a user (called after register/login). */
export async function createSession(user: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Resolve the current user from the session cookie. Memoized per-request via
 * React `cache` so multiple server components share a single DB read.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySession(token);
  if (!claims?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return user;
});

/** Same as getCurrentUser but throws 401 when unauthenticated. */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "You must be signed in to do that.", "UNAUTHENTICATED");
  }
  return user;
}
