import { z } from "zod";

/** 0–10 score that tolerates strings/out-of-range/missing values from the LLM. */
const score = z.coerce
  .number()
  .catch(5)
  .transform((n) => Math.max(0, Math.min(10, Number.isFinite(n) ? n : 5)));

const strList = z.array(z.string()).catch([]).default([]);

export const evaluationSchema = z.object({
  correctness: score,
  depth: score,
  confidence: score,
  communication: score,
  technical: score,
  strengths: strList,
  weaknesses: strList,
  evidence: strList,
  extractedFacts: strList,
  summary: z.string().catch("").default(""),
});

export const plannerSchema = z.object({
  action: z
    .enum(["continue", "follow_up", "challenge", "move_topic", "end"])
    .catch("continue"),
  targetTopic: z.string().nullable().catch(null).default(null),
  difficultyDelta: z.coerce
    .number()
    .catch(0)
    .transform((n) => Math.max(-1, Math.min(1, Math.round(Number.isFinite(n) ? n : 0)))),
  reason: z.string().catch("").default(""),
});
