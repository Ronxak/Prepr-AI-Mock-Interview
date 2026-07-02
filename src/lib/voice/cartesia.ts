import { env, hasCartesia } from "@/lib/env";

/**
 * Synthesize speech with Cartesia and return MP3 bytes. Runs server-side so the
 * API key never reaches the browser; audio is proxied back through /api/voice/tts.
 * Returns null when Cartesia isn't configured or the call fails (the client then
 * falls back to the browser speechSynthesis engine).
 */
export async function synthesizeSpeech(
  text: string,
): Promise<ArrayBuffer | null> {
  if (!hasCartesia()) return null;
  try {
    const res = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        "X-API-Key": env.CARTESIA_API_KEY,
        "Cartesia-Version": "2024-11-13",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: env.CARTESIA_MODEL,
        transcript: text,
        voice: { mode: "id", id: env.CARTESIA_VOICE_ID },
        language: "en",
        output_format: {
          container: "mp3",
          sample_rate: 44100,
          bit_rate: 128000,
        },
      }),
    });
    if (!res.ok) {
      console.error(
        "[cartesia] tts failed:",
        res.status,
        await res.text().catch(() => ""),
      );
      return null;
    }
    return await res.arrayBuffer();
  } catch (err) {
    console.error("[cartesia] tts error:", err);
    return null;
  }
}
