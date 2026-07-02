import type { SttCallbacks, SttRecognizer } from "@/lib/voice/browser-stt";

/**
 * Deepgram streaming STT backend. Opens a browser WebSocket to Deepgram using a
 * short-lived token (via the "token" subprotocol — the long-lived key never
 * reaches the client) and streams microphone audio (webm/opus) for live
 * interim + final transcripts. Any failure surfaces via onError so the caller
 * can fall back to the browser recognizer.
 */
export async function createDeepgramRecognizer(
  token: string,
  model: string,
  cb: SttCallbacks,
  stream: MediaStream,
): Promise<SttRecognizer> {
  let ws: WebSocket | null = null;
  let recorder: MediaRecorder | null = null;

  async function start() {

    const params = new URLSearchParams({
      model,
      language: "en-US",
      smart_format: "true",
      interim_results: "true",
      punctuate: "true",
    });
    ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params.toString()}`,
      ["token", token],
    );

    ws.onopen = () => {
      cb.onOpen?.();
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      recorder = new MediaRecorder(stream!, { mimeType: mime });
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
          ws.send(ev.data);
        }
      };
      recorder.start(250);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          is_final?: boolean;
          channel?: { alternatives?: { transcript?: string }[] };
        };
        const transcript = msg.channel?.alternatives?.[0]?.transcript ?? "";
        if (!transcript) return;
        if (msg.is_final) cb.onFinal(transcript.trim());
        else cb.onInterim(transcript);
      } catch {
        /* keep-alive / non-JSON frames */
      }
    };

    ws.onerror = () => cb.onError("deepgram-ws");
  }

  function stop() {
    try {
      recorder?.state !== "inactive" && recorder?.stop();
    } catch {
      /* noop */
    }
    try {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "CloseStream" }));
      }
    } catch {
      /* noop */
    }
    stream?.getTracks().forEach((t) => t.stop());
  }

  function destroy() {
    stop();
    try {
      ws?.close();
    } catch {
      /* noop */
    }
    ws = null;
    recorder = null;
    // NOTE: the MediaStream is owned by useSpeechToText (shared with the
    // amplitude meter), so we don't stop or clear it here.
  }

  return { start, stop, destroy };
}
