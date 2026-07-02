import { ok, handleError } from "@/lib/http";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await destroySession();
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
