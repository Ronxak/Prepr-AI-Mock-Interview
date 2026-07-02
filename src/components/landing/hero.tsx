"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InterviewPreview } from "@/components/landing/interview-preview";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[-10%] size-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-28">
        <div className="flex flex-col items-start">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground"
          >
            <Sparkles className="size-3.5 text-primary" />
            Adaptive voice interviews · powered by Groq + LangGraph
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Your AI interviewer is <span className="text-gradient">listening</span>.
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground"
          >
            Not a quiz. A real conversation. Prepr listens to your answers, asks
            sharp follow-ups, challenges weak reasoning, and adapts difficulty in
            real time — then hands you an evidence-backed scorecard.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg">
              <Link href="/signup">
                Start a mock interview <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </motion.div>

          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success" /> Voice-first
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success" /> Remembers your answers
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success" /> Uses your resume
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
        >
          <InterviewPreview />
        </motion.div>
      </div>
    </section>
  );
}
