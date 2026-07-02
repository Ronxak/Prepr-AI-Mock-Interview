"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "idle" | "speaking" | "listening";

const TONE_CLASS: Record<Tone, string> = {
  idle: "bg-muted-foreground/40",
  speaking: "bg-primary",
  listening: "bg-success",
};

/** Animated bar waveform. Bars come alive when speaking/listening. */
export function Waveform({
  tone,
  bars = 44,
  amplitudes,
}: {
  tone: Tone;
  bars?: number;
  amplitudes?: number[];
}) {
  const active = tone !== "idle";
  return (
    <div className="flex h-24 items-center justify-center gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => {
        let heightProp: any = { height: 6 };
        
        if (active) {
          if (amplitudes && amplitudes.length > 0) {
            // Map 0-1 amplitude to 6-40px height
            const val = amplitudes[i % amplitudes.length] || 0;
            const h = Math.max(6, val * 40);
            // Without transition, we just animate to the live value
            heightProp = { height: h };
          } else {
            const peak = 10 + ((i * 17) % 46);
            heightProp = { height: [6, peak, 12, peak * 0.7, 6] };
          }
        }

        return (
          <motion.span
            key={i}
            className={cn("w-[3px] rounded-full", TONE_CLASS[tone])}
            animate={heightProp}
            transition={
              active && (!amplitudes || amplitudes.length === 0)
                ? {
                    duration: 0.8 + ((i % 6) * 0.14),
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (i % 9) * 0.05,
                  }
                : { duration: 0.1 } // fast snap for live data
            }
          />
        );
      })}
    </div>
  );
}
