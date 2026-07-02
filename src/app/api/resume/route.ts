import type { NextRequest } from "next/server";
import { ok, handleError, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { detectResumeType } from "@/lib/resume/extract";
import {
  analyzeAndStoreResume,
  getLatestResume,
} from "@/services/resume.service";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Latest resume for the current user (null if none). */
export async function GET() {
  try {
    const user = await requireUser();
    const resume = await getLatestResume(user.id);
    return ok({ resume });
  } catch (err) {
    return handleError(err);
  }
}

/** Upload + analyze a resume (multipart/form-data, field "file"). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(400, "No file was uploaded.", "NO_FILE");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError(413, "That file is too large (max 5MB).", "TOO_LARGE");
    }
    const type = detectResumeType(file.name, file.type);
    if (!type) {
      throw new ApiError(
        415,
        "Unsupported file type. Please upload a PDF, DOCX, or TXT.",
        "UNSUPPORTED",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resume = await analyzeAndStoreResume(user.id, {
      fileName: file.name,
      fileType: type,
      buffer,
    });
    return ok({ resume }, 201);
  } catch (err) {
    return handleError(err);
  }
}
