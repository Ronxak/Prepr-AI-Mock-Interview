import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getInterviewForUser } from "@/services/interview.service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const interview = await getInterviewForUser(id, user.id);
    return ok(interview);
  } catch (err) {
    return handleError(err);
  }
}
