import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getFullReport } from "@/services/report.service";

export const runtime = "nodejs";
export const maxDuration = 60; // report may be generated on first load

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const report = await getFullReport(id, user.id);
    return ok(report);
  } catch (err) {
    return handleError(err);
  }
}
