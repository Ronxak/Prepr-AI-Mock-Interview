import type { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/http";
import { loginSchema } from "@/lib/validation/auth";
import { authenticateUser } from "@/services/auth.service";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = loginSchema.parse(await req.json());
    const user = await authenticateUser(input);
    await createSession(user);
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
