"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useMicAmplitude } from "@/hooks/use-mic-amplitude";
import { useSilenceDetector } from "@/hooks/use-silence-detector";
import type { SubmitResult } from "@/services/interview.service";

export type InterviewPhase =
  | "idle" // not started (awaiting user gesture)
  | "speaking" // interviewer talking
  | "listening" // candidate answering
  | "processing" // engine thinking
  | "ended"
  | "error";

export interface LiveTurn {
  role: "interviewer" | "candidate";
  content: string;
}

export function useVoiceInterview(params: {
  interviewId: string;
  firstQuestion: string;
  initialTopic: string;
  initialTurns: LiveTurn[];
  alreadyEnded: boolean;
}) {
  const router = useRouter();
  const tts = useTextToSpeech();
  const stt = useSpeechToText();

  const [phase, setPhase] = useState<InterviewPhase>(
    params.alreadyEnded ? "ended" : "idle",
  );
  const [currentQuestion, setCurrentQuestion] = useState(params.firstQuestion);
  const [topic, setTopic] = useState(params.initialTopic);
  const [turns, setTurns] = useState<LiveTurn[]>(params.initialTurns);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const { rmsLevel, amplitudes } = useMicAmplitude(stt.mediaStream);
  const liveCaption = `${stt.finalTranscript} ${stt.interim}`.trim();

  const speak = useCallback(
    async (text: string) => {
      setPhase("speaking");
      await tts.speak(text);
    },
    [tts],
  );

  const beginListening = useCallback(async () => {
    stt.reset();
    setPhase("listening");
    await stt.start();
  }, [stt]);

  /** Called on the initial user gesture (needed to unlock audio playback). */
  const start = useCallback(async () => {
    setError(null);
    await speak(currentQuestion);
    await beginListening();
  }, [speak, beginListening, currentQuestion]);

  const submitAnswer = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const answer = `${stt.finalTranscript} ${stt.interim}`.trim();
    stt.stop();
    setPhase("processing");
    setTurns((t) => [...t, { role: "candidate", content: answer || "(no answer)" }]);

    try {
      // Advance the interview and speak the next question in full before we start
      // listening again — the same reliable path the first question uses. (The
      // earlier /api/voice/stream binary path could drop audio when frames split
      // across read boundaries, so questions after the first went unspoken.)
      const res = await apiFetch<SubmitResult>("/api/interview/turn", {
        method: "POST",
        body: JSON.stringify({ interviewId: params.interviewId, transcript: answer }),
      });

      setCurrentQuestion(res.question);
      setTopic(res.topic);
      setTurns((t) => [...t, { role: "interviewer", content: res.question }]);

      // Read the question out loud, then hand the mic back to the candidate.
      await speak(res.question);

      if (res.ended) {
        setPhase("ended");
        window.setTimeout(() => router.push(`/report/${params.interviewId}`), 1500);
      } else {
        await beginListening();
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Something went wrong processing your answer.",
      );
      setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }, [stt, params.interviewId, speak, beginListening, router]);

  const { silenceProgress } = useSilenceDetector(rmsLevel, {
    enabled: phase === "listening" && liveCaption.length > 0 && !submittingRef.current,
    onSilence: submitAnswer,
  });

  const retryListening = useCallback(async () => {
    setError(null);
    await beginListening();
  }, [beginListening]);

  const endNow = useCallback(async () => {
    stt.stop();
    tts.cancel();
    setPhase("processing");
    try {
      await apiFetch("/api/interview/end", {
        method: "POST",
        body: JSON.stringify({ interviewId: params.interviewId }),
      });
    } catch {
      /* still navigate — report generates on load if needed */
    }
    router.push(`/report/${params.interviewId}`);
  }, [stt, tts, params.interviewId, router]);

  return {
    phase,
    currentQuestion,
    topic,
    turns,
    error,
    interim: stt.interim,
    finalTranscript: stt.finalTranscript,
    listening: stt.listening,
    speaking: tts.speaking,
    sttError: stt.error,
    engine: stt.engine,
    amplitudes,
    silenceProgress,
    start,
    submitAnswer,
    retryListening,
    endNow,
    stopSpeaking: tts.cancel,
  };
}
