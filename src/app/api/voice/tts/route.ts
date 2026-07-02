import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { synthesizeSpeech } from "@/lib/voice/cartesia";

export const runtime = "nodejs";

const bodySchema = z.object({ text: z.string().min(1).max(2000) });

/**
 * Proxy TTS through the server so the Cartesia key stays private. Returns MP3
 * bytes on success, or JSON { fallback: true } when TTS isn't available — the
 * client then speaks with the browser's speechSynthesis.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { text } = bodySchema.parse(await req.json());
    const audio = await synthesizeSpeech(text);
    if (!audio) {
      return NextResponse.json({ fallback: true }, { status: 200 });
    }
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
