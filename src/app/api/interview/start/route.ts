import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { startInterview } from "@/services/interview.service";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  resumeId: z.string().nullish(),
  type: z
    .enum([
      "SOFTWARE_ENGINEER",
      "FRONTEND_ENGINEER",
      "DATA_ENGINEER",
      "SITE_RELIABILITY_ENGINEER",
    ])
    .nullish(),
  difficultyPreset: z.number().int().min(1).max(5).nullish(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { resumeId, type, difficultyPreset } = bodySchema.parse(await req.json().catch(() => ({})));
    const result = await startInterview(user.id, {
      resumeId: resumeId ?? null,
      type: type ?? undefined,
      difficultyPreset: difficultyPreset ?? undefined,
    });
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
