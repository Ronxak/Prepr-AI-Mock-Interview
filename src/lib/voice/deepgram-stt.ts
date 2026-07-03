import type { SttCallbacks, SttRecognizer } from "@/lib/voice/browser-stt";

/** How long to wait for the Deepgram socket to open before giving up and
 * letting the caller fall back to the browser recognizer. */
const CONNECT_TIMEOUT_MS = 6000;

/**
 * Deepgram streaming STT backend. Opens a browser WebSocket to Deepgram using a
 * short-lived token (via the "bearer" subprotocol — the long-lived key never
 * reaches the client) and streams microphone audio (webm/opus) for live
 * interim + final transcripts.
 *
 * `start()` resolves only once the socket is actually open and rejects if it
 * fails to connect (bad token, network, unsupported), so the caller can cleanly
 * fall back to the browser recognizer instead of getting stuck with a dead
 * connection and no transcripts.
 */
export async function createDeepgramRecognizer(
  token: string,
  model: string,
  cb: SttCallbacks,
  stream: MediaStream,
): Promise<SttRecognizer> {
  let ws: WebSocket | null = null;
  let recorder: MediaRecorder | null = null;
  let opened = false;

  function startRecorder() {
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
        ws.send(ev.data);
      }
    };
    recorder.start(250);
  }

  function start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        model,
        language: "en-US",
        smart_format: "true",
        interim_results: "true",
        punctuate: "true",
      });

      // Temporary tokens from /v1/auth/grant authenticate with the "bearer"
      // subprotocol (long-lived API keys would use "token"). The browser
      // WebSocket API can't send an Authorization header, so Deepgram reads it
      // from the Sec-WebSocket-Protocol handshake instead.
      try {
        ws = new WebSocket(
          `wss://api.deepgram.com/v1/listen?${params.toString()}`,
          ["bearer", token],
        );
      } catch {
        reject(new Error("deepgram-init"));
        return;
      }

      const timer = setTimeout(() => {
        if (!opened) {
          try {
            ws?.close();
          } catch {
            /* noop */
          }
          reject(new Error("deepgram-timeout"));
        }
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        opened = true;
        clearTimeout(timer);
        cb.onOpen?.();
        try {
          startRecorder();
        } catch {
          cb.onError("recorder-failed");
        }
        resolve();
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

      ws.onerror = () => {
        clearTimeout(timer);
        if (!opened) {
          // Failed before ever opening — reject so the caller falls back.
          try {
            ws?.close();
          } catch {
            /* noop */
          }
          reject(new Error("deepgram-ws"));
        } else {
          // Dropped after a good connection — surface for a manual retry.
          cb.onError("deepgram-dropped");
        }
      };

      ws.onclose = (ev) => {
        // An abnormal close before we opened (e.g. auth rejected) also means
        // fail-fast so we don't wait out the full timeout.
        if (!opened) {
          clearTimeout(timer);
          reject(new Error(`deepgram-close-${ev.code}`));
        }
      };
    });
  }

  function stop() {
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
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
    // NOTE: the MediaStream is owned by useSpeechToText (shared with the
    // amplitude meter), so we don't stop its tracks here.
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
  }

  return { start, stop, destroy };
}
