"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text-to-speech with graceful degradation:
 *  1. Cartesia (server proxy /api/voice/tts → MP3) — plays via <audio>.
 *  2. Browser speechSynthesis fallback when Cartesia isn't configured/available.
 * `speak` resolves when playback finishes so the caller can then start listening.
 */
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const serverTtsAvailableRef = useRef(true);
  
  // Streaming audio context state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamStartTimeRef = useRef(0);
  const streamNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    streamNodesRef.current.forEach(n => n.stop());
    streamNodesRef.current = [];
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speakBrowser = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve();
          return;
        }
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.02;
        utter.pitch = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => /en[-_]?US/i.test(v.lang) && /natural|google|samantha|aria|zira/i.test(v.name)) ??
          voices.find((v) => v.lang.startsWith("en"));
        if (preferred) utter.voice = preferred;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }),
    [],
  );

  const speak = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      cancel();
      setSpeaking(true);
      try {
        if (serverTtsAvailableRef.current) {
          const res = await fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: clean }),
          });
          const contentType = res.headers.get("content-type") ?? "";
          if (res.ok && contentType.includes("audio")) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            await new Promise<void>((resolve) => {
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              audio.onerror = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              void audio.play().catch(() => resolve());
            });
            return;
          }
          // Not configured — stop hitting the network on subsequent calls.
          serverTtsAvailableRef.current = false;
        }
        await speakBrowser(clean);
      } catch {
        await speakBrowser(clean);
      } finally {
        setSpeaking(false);
      }
    },
    [cancel, speakBrowser],
  );

  const createStreamPlayer = useCallback(() => {
    cancel();
    setSpeaking(true);
    
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    streamStartTimeRef.current = audioCtx.currentTime;
    streamNodesRef.current = [];
    
    return {
      playChunk: async (chunk: Uint8Array) => {
        try {
          if (!audioCtxRef.current || audioCtxRef.current !== audioCtx) return;
          // Each chunk is a complete, self-contained MP3 (one sentence from the
          // server's sentence-level streaming), so decodeAudioData succeeds per chunk.
          // Copy into a fresh ArrayBuffer (decodeAudioData requires ArrayBuffer, not SharedArrayBuffer).
          const copy = new Uint8Array(chunk.byteLength);
          copy.set(chunk);
          const decoded = await audioCtx.decodeAudioData(copy.buffer);
          
          if (!audioCtxRef.current || audioCtxRef.current !== audioCtx) return;
          
          const source = audioCtx.createBufferSource();
          source.buffer = decoded;
          source.connect(audioCtx.destination);
          
          const playTime = Math.max(audioCtx.currentTime, streamStartTimeRef.current);
          source.start(playTime);
          streamStartTimeRef.current = playTime + decoded.duration;
          
          streamNodesRef.current.push(source);
          source.onended = () => {
            streamNodesRef.current = streamNodesRef.current.filter(n => n !== source);
          };
        } catch (e) {
          // If decoding fails, ignore (can happen if chunk boundary splits a frame)
        }
      },
      waitToEnd: async () => {
        if (!audioCtxRef.current || audioCtxRef.current !== audioCtx) return;
        const delay = Math.max(0, streamStartTimeRef.current - audioCtx.currentTime);
        await new Promise(resolve => setTimeout(resolve, delay * 1000 + 100));
        setSpeaking(false);
        if (audioCtxRef.current === audioCtx) {
          audioCtx.close().catch(() => {});
          audioCtxRef.current = null;
        }
      }
    };
  }, [cancel]);

  useEffect(() => () => cancel(), [cancel]);

  return { speak, createStreamPlayer, cancel, speaking };
}
