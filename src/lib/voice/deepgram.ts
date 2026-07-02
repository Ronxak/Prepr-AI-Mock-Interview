import { env, hasDeepgram } from "@/lib/env";

export interface DeepgramGrant {
  token: string;
  expiresIn: number;
  model: string;
}

/**
 * Mint a short-lived Deepgram token so the browser can open a streaming STT
 * socket without ever seeing the long-lived API key. Returns null when Deepgram
 * isn't configured (the client then uses the browser SpeechRecognition fallback).
 */
export async function grantDeepgramToken(): Promise<DeepgramGrant | null> {
  if (!hasDeepgram()) return null;
  try {
    const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 60 }),
    });
    if (!res.ok) {
      console.error("[deepgram] token grant failed:", res.status);
      return null;
    }
    const json = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    return {
      token: json.access_token,
      expiresIn: json.expires_in ?? 60,
      model: env.DEEPGRAM_MODEL,
    };
  } catch (err) {
    console.error("[deepgram] token grant error:", err);
    return null;
  }
}
