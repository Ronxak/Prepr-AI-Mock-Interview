import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { grantDeepgramToken } from "@/lib/voice/deepgram";

export const runtime = "nodejs";

/** Short-lived Deepgram token for browser STT streaming (or availability:false). */
export async function GET() {
  try {
    await requireUser();
    const grant = await grantDeepgramToken();
    if (!grant) return ok({ available: false });
    return ok({ available: true, ...grant });
  } catch (err) {
    return handleError(err);
  }
}
