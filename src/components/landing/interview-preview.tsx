"use client";

import { motion } from "framer-motion";
import { Brain, Target, Mic } from "lucide-react";

/** Decorative "live interview" mock shown in the hero. Pure presentation. */
export function InterviewPreview() {
  return (
    <div className="w-full max-w-md">
      <div className="relative rounded-2xl border border-border/70 bg-card/80 p-5 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-success" />
            Live · 04:12
          </div>
          <div className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
            System Design
          </div>
        </div>

        {/* Waveform */}
        <div className="mt-5 flex h-16 items-center justify-center gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <motion.span
              key={i}
              className="w-1 rounded-full bg-primary/70"
              animate={{ height: [6, 8 + ((i * 13) % 34), 6] }}
              transition={{
                duration: 0.9 + ((i % 5) * 0.12),
                repeat: Infinity,
                ease: "easeInOut",
                delay: (i % 7) * 0.06,
              }}
            />
          ))}
        </div>

        {/* Transcript */}
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex gap-2.5">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
              AI
            </span>
            <p className="leading-relaxed text-foreground/90">
              You mentioned caching earlier — where would that fall over at 10×
              the traffic?
            </p>
          </div>
          <div className="flex justify-end gap-2.5">
            <p className="max-w-[80%] rounded-xl rounded-tr-sm bg-secondary px-3 py-2 leading-relaxed text-secondary-foreground">
              I&apos;d add a read replica and move sessions to Redis…
            </p>
          </div>
        </div>

        {/* Reasoning chips */}
        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
            <Brain className="size-3" /> Evaluating
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
            <Target className="size-3" /> Planning follow-up
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-success">
            <Mic className="size-3" /> +0.4 depth
          </span>
        </div>
      </div>
    </div>
  );
}
