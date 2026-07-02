import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { endInterview } from "@/services/interview.service";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  interviewId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { interviewId } = bodySchema.parse(await req.json());
    const result = await endInterview(interviewId, user.id);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
