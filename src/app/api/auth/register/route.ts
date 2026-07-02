import type { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/http";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/services/auth.service";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = registerSchema.parse(await req.json());
    const user = await registerUser(input);
    await createSession(user);
    return ok({ user }, 201);
  } catch (err) {
    return handleError(err);
  }
}
