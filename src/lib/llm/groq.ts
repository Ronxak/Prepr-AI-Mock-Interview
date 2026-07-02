import Groq from "groq-sdk";
import type { ZodType } from "zod";
import { env, hasGroq } from "@/lib/env";
import { ApiError } from "@/lib/http";

let client: Groq | null = null;

function groq(): Groq {
  if (!hasGroq()) {
    throw new ApiError(
      503,
      "The AI interviewer isn't configured. Set GROQ_API_KEY in your environment.",
      "GROQ_UNCONFIGURED",
    );
  }
  client ??= new Groq({ apiKey: env.GROQ_API_KEY });
  return client;
}

export type Speed = "fast" | "quality";

function pickModel(speed: Speed): string {
  return speed === "quality" ? env.GROQ_MODEL_QUALITY : env.GROQ_MODEL_FAST;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface BaseOpts {
  speed?: Speed;
  temperature?: number;
  maxTokens?: number;
}

/** Free-form text completion (used by the Interviewer agent). */
export async function chatText(
  messages: ChatMessage[],
  opts: BaseOpts = {},
): Promise<string> {
  const res = await groq().chat.completions.create({
    model: pickModel(opts.speed ?? "quality"),
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 400,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/** Streaming text completion — yields token deltas as they arrive. */
export async function* chatStream(
  messages: ChatMessage[],
  opts: BaseOpts = {},
): AsyncGenerator<string> {
  const stream = await groq().chat.completions.create({
    model: pickModel(opts.speed ?? "quality"),
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 400,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

function parseJsonLoose(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

/**
 * JSON-mode completion validated against a zod schema (Evaluator/Planner/Resume).
 * Groq requires the literal word "json" somewhere in the prompt for JSON mode,
 * which our system prompts guarantee.
 */
export async function chatJSON<T>(
  messages: ChatMessage[],
  schema: ZodType<T>,
  opts: BaseOpts = {},
): Promise<T> {
  const res = await groq().chat.completions.create({
    model: pickModel(opts.speed ?? "fast"),
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 1024,
    response_format: { type: "json_object" },
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return schema.parse(parseJsonLoose(raw));
}
