import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getAnalytics } from "@/services/analytics.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const analytics = await getAnalytics(user.id);
    return ok(analytics);
  } catch (err) {
    return handleError(err);
  }
}
