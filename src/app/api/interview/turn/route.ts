import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { submitAnswer } from "@/services/interview.service";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  interviewId: z.string().min(1),
  transcript: z.string().default(""),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { interviewId, transcript } = bodySchema.parse(await req.json());
    const result = await submitAnswer(interviewId, user.id, transcript);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
