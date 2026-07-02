import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { deleteResume } from "@/services/resume.service";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteResume(id, user.id);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
