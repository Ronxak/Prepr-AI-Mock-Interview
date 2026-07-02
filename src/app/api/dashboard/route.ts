import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getDashboard } from "@/services/analytics.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const stats = await getDashboard(user.id);
    return ok(stats);
  } catch (err) {
    return handleError(err);
  }
}
