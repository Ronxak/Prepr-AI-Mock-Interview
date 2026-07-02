import { synthesizeSpeech } from "@/lib/voice/cartesia";
import { hasCartesia } from "@/lib/env";

/**
 * Streaming TTS via sentence-level chunking.
 *
 * As interviewer tokens arrive from the LLM, we buffer them into whole sentences
 * and synthesize each sentence the moment it completes — so audio starts playing
 * long before the full response is generated. Each yielded chunk is a complete,
 * self-contained MP3 (from the proven Cartesia REST endpoint), which means the
 * browser can decode and play chunks individually with `decodeAudioData`.
 *
 * This is deliberately built on the verified REST path rather than the WebSocket
 * SDK: it removes an entire class of framing/decoding bugs while still delivering
 * the latency win. Yields nothing when Cartesia isn't configured (caller falls
 * back to the non-streaming flow).
 */

const MIN_SENTENCE_LEN = 12;

/** Index (inclusive) of the end of the first complete sentence, or -1. */
function sentenceBoundary(text: string): number {
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ((c === "." || c === "!" || c === "?" || c === "\n") && i >= MIN_SENTENCE_LEN) {
      // Consume any trailing closing quotes/brackets so they stay with the sentence.
      let end = i;
      while (end + 1 < text.length && /["'”’)\]]/.test(text[end + 1]!)) end++;
      return end;
    }
  }
  return -1;
}

export async function* synthesizeSpeechStream(
  textStream: AsyncIterable<string>,
): AsyncGenerator<Uint8Array> {
  if (!hasCartesia()) return;

  async function* speak(segment: string): AsyncGenerator<Uint8Array> {
    const clean = segment.trim();
    if (!clean) return;
    const audio = await synthesizeSpeech(clean);
    if (audio) yield new Uint8Array(audio);
  }

  let buffer = "";
  for await (const chunk of textStream) {
    buffer += chunk;
    let boundary = sentenceBoundary(buffer);
    while (boundary !== -1) {
      const sentence = buffer.slice(0, boundary + 1);
      buffer = buffer.slice(boundary + 1);
      yield* speak(sentence);
      boundary = sentenceBoundary(buffer);
    }
  }

  // Flush whatever is left (the final sentence, usually without trailing punctuation).
  yield* speak(buffer);
}
