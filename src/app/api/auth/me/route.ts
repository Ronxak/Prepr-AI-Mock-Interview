import { ok, fail, handleError } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Not authenticated", "UNAUTHENTICATED");
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
