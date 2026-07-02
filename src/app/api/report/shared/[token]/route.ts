import { ok, handleError } from "@/lib/http";
import { getSharedReport } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const report = await getSharedReport(token);
    return ok(report);
  } catch (err) {
    return handleError(err);
  }
}
