import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { toggleShare } from "@/services/report.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    
    const body = await req.json();
    const enable = !!body.enable;
    
    const token = await toggleShare(id, user.id, enable);
    return ok({ shareToken: token });
  } catch (err) {
    return handleError(err);
  }
}
