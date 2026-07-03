"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  createBrowserRecognizer,
  isBrowserSttSupported,
  type SttRecognizer,
} from "@/lib/voice/browser-stt";
import { createDeepgramRecognizer } from "@/lib/voice/deepgram-stt";

export type SttEngine = "deepgram" | "browser";

/**
 * Speech-to-text with Deepgram streaming preferred and browser SpeechRecognition
 * as the fallback. Accumulates final segments into `finalTranscript` and exposes
 * the live `interim` text for the waveform/caption.
 */
export function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<SttEngine | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const recRef = useRef<SttRecognizer | null>(null);
  const finalRef = useRef("");

  const callbacks = useMemo(
    () => ({
      onInterim: (t: string) => setInterim(t),
      onFinal: (segment: string) => {
        if (!segment) return;
        finalRef.current = `${finalRef.current} ${segment}`.trim();
        setFinalTranscript(finalRef.current);
        setInterim("");
      },
      onError: (e: string) => {
        if (e === "not-allowed" || e === "service-not-allowed") {
          setError("Microphone access was blocked. Enable it and try again.");
        } else if (e === "unsupported") {
          setError("Speech recognition isn't supported in this browser.");
        } else if (e === "deepgram-dropped") {
          setError("Voice connection dropped — tap Restart microphone.");
        } else {
          setError("Speech recognition hit a snag — tap Restart microphone.");
        }
      },
      onOpen: () => {
        setListening(true);
        setError(null);
      },
    }),
    [],
  );

  const reset = useCallback(() => {
    finalRef.current = "";
    setFinalTranscript("");
    setInterim("");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    recRef.current?.destroy();
    
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
    } catch {
      setError("Microphone access was blocked. Enable it and try again.");
      return;
    }

    // Deepgram streaming needs MediaRecorder-encoded webm/opus audio, which only
    // Chromium browsers produce — Safari and Firefox can't, so their MediaRecorder
    // would open the socket but never send decodable audio. Gate on that support
    // and let those browsers use the native SpeechRecognition fallback instead.
    const canStreamToDeepgram =
      typeof MediaRecorder !== "undefined" &&
      (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ||
        MediaRecorder.isTypeSupported("audio/webm"));

    // Prefer Deepgram when supported and a token is available. Only commit to it
    // once the socket actually opens — if it can't connect or the recorder can't
    // start, rec.start() rejects and we fall through to the browser recognizer,
    // so the user always ends up with working speech-to-text.
    try {
      const grant = canStreamToDeepgram
        ? await apiFetch<{
            available: boolean;
            token?: string;
            model?: string;
          }>("/api/voice/token")
        : { available: false as const };
      if (grant.available && grant.token) {
        const rec = await createDeepgramRecognizer(
          grant.token,
          grant.model ?? "nova-2",
          callbacks,
          stream
        );
        try {
          await rec.start();
          recRef.current = rec;
          setEngine("deepgram");
          setListening(true);
          return;
        } catch {
          rec.destroy();
          /* fall through to browser */
        }
      }
    } catch {
      /* token fetch failed — fall through to browser */
    }

    // Browser fallback. Clear any transient error from the Deepgram attempt.
    setError(null);
    if (isBrowserSttSupported()) {
      const rec = createBrowserRecognizer(callbacks);
      recRef.current = rec;
      setEngine("browser");
      await rec.start();
      setListening(true);
    } else {
      setError("Speech recognition isn't supported in this browser.");
    }
  }, [callbacks]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
    setInterim("");
    setMediaStream((s) => {
      s?.getTracks().forEach(t => t.stop());
      return null;
    });
  }, []);

  useEffect(
    () => () => {
      recRef.current?.destroy();
      setMediaStream((s) => {
        s?.getTracks().forEach(t => t.stop());
        return null;
      });
    },
    [],
  );

  const supported =
    typeof window !== "undefined" &&
    (isBrowserSttSupported() ||
      typeof navigator !== "undefined" && !!navigator.mediaDevices);

  return {
    supported,
    listening,
    interim,
    finalTranscript,
    error,
    engine,
    mediaStream,
    start,
    stop,
    reset,
  };
}
