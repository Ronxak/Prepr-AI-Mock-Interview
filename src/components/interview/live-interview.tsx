"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Send,
  Loader2,
  PhoneOff,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Waveform } from "@/components/interview/waveform";
import { InterviewTimer } from "@/components/interview/interview-timer";
import { useVoiceInterview, type LiveTurn } from "@/hooks/useVoiceInterview";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<string, string> = {
  idle: "Ready when you are",
  speaking: "Interviewer speaking",
  listening: "Listening — answer out loud",
  processing: "Thinking…",
  ended: "Interview complete",
  error: "Something went wrong",
};

export function LiveInterview(props: {
  interviewId: string;
  firstQuestion: string;
  initialTopic: string;
  initialTurns: LiveTurn[];
  startedAtMs: number;
  alreadyEnded: boolean;
}) {
  const vi = useVoiceInterview({
    interviewId: props.interviewId,
    firstQuestion: props.firstQuestion,
    initialTopic: props.initialTopic,
    initialTurns: props.initialTurns,
    alreadyEnded: props.alreadyEnded,
  });

  const tone =
    vi.phase === "speaking"
      ? "speaking"
      : vi.phase === "listening"
        ? "listening"
        : "idle";

  const liveCaption = `${vi.finalTranscript} ${vi.interim}`.trim();

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1.5">
            <Sparkles className="size-3" /> {vi.topic}
          </Badge>
          {vi.engine && vi.phase === "listening" && (
            <Badge variant="secondary" className="capitalize">
              {vi.engine === "deepgram" ? "Deepgram" : "Browser"} STT
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                vi.phase === "listening"
                  ? "animate-pulse bg-success"
                  : vi.phase === "speaking"
                    ? "animate-pulse bg-primary"
                    : "bg-muted-foreground/50",
              )}
            />
            <InterviewTimer
              startedAt={props.startedAtMs}
              running={vi.phase !== "idle" && vi.phase !== "ended"}
            />
          </span>
          <EndButton onConfirm={vi.endNow} />
        </div>
      </div>

      {/* Stage */}
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="relative">
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-500",
              tone === "speaking"
                ? "bg-primary/25"
                : tone === "listening"
                  ? "bg-success/20"
                  : "bg-muted-foreground/10",
            )}
          />
          <div className="relative grid size-28 place-items-center rounded-full border border-border/70 bg-card/60">
            {vi.phase === "processing" ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            ) : vi.phase === "speaking" ? (
              <Volume2 className="size-8 text-primary" />
            ) : (
              <>
                <Mic
                  className={cn(
                    "size-8",
                    vi.phase === "listening" ? "text-success" : "text-muted-foreground",
                  )}
                />
                {/* Silence countdown circular progress indicator */}
                {vi.silenceProgress > 0 && vi.phase === "listening" && (
                  <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="48"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-success"
                      strokeDasharray="301.59"
                      strokeDashoffset={301.59 * (1 - vi.silenceProgress)}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm font-medium text-muted-foreground">
          {vi.silenceProgress > 0 && vi.phase === "listening" ? (
            <span className="text-success">Auto-submitting…</span>
          ) : (
            PHASE_LABEL[vi.phase]
          )}
        </p>

        <Waveform tone={tone} amplitudes={vi.amplitudes} />

        {/* Current question */}
        <AnimatePresence mode="wait">
          <motion.p
            key={vi.currentQuestion}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="mt-4 max-w-xl text-balance text-lg font-medium leading-relaxed"
          >
            {vi.currentQuestion}
          </motion.p>
        </AnimatePresence>

        {/* Live caption */}
        {vi.phase === "listening" && (
          <p className="mt-4 min-h-6 max-w-xl text-pretty text-sm text-muted-foreground">
            {liveCaption || "Start speaking…"}
          </p>
        )}

        {/* STT error */}
        {vi.sttError && vi.phase === "listening" && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-warning">
            <AlertTriangle className="size-4" /> {vi.sttError}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border/60 pt-6">
        {vi.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={vi.start}>
              <Mic className="size-4" /> Begin interview
            </Button>
            <p className="text-xs text-muted-foreground">
              We&apos;ll ask for microphone access. Answer out loud, like a real call.
            </p>
          </div>
        )}

        {vi.phase === "listening" && (
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={vi.submitAnswer} disabled={!liveCaption}>
              <Send className="size-4" /> Submit answer
            </Button>
            <button
              onClick={vi.retryListening}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3" /> Restart microphone
            </button>
          </div>
        )}

        {vi.phase === "speaking" && (
          <p className="text-center text-sm text-muted-foreground">
            Listening will start automatically…
          </p>
        )}

        {vi.phase === "processing" && (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Evaluating your answer and
            planning the next question…
          </p>
        )}

        {vi.phase === "ended" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              That&apos;s a wrap. Preparing your report…
            </p>
            <Button asChild variant="outline">
              <Link href={`/report/${props.interviewId}`}>View report</Link>
            </Button>
          </div>
        )}

        {vi.phase === "error" && (
          <div className="flex flex-col items-center gap-3">
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="size-4" /> {vi.error}
            </p>
            <Button variant="outline" onClick={vi.retryListening}>
              <RotateCcw className="size-4" /> Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EndButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <PhoneOff className="size-4" /> End
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End the interview?</DialogTitle>
          <DialogDescription>
            We&apos;ll wrap up now and generate your report from the conversation so
            far. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep going</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            End &amp; see report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
