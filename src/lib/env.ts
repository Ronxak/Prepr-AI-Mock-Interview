import { z } from "zod";

/**
 * Validated, typed environment. Imported by Node-runtime code only (services,
 * API route handlers). Edge middleware must NOT import this — see lib/auth/jwt.ts
 * for why (Edge does not reliably enumerate the whole process.env object).
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().default("http://localhost:3000"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL_QUALITY: z.string().default("llama-3.3-70b-versatile"),
  GROQ_MODEL_FAST: z.string().default("llama-3.1-8b-instant"),

  DEEPGRAM_API_KEY: z.string().default(""),
  DEEPGRAM_MODEL: z.string().default("nova-2"),

  CARTESIA_API_KEY: z.string().default(""),
  CARTESIA_MODEL: z.string().default("sonic-2"),
  CARTESIA_VOICE_ID: z.string().default(""),

  EMBEDDING_CACHE_DIR: z.string().default("./local_cache"),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n❌ Invalid environment variables:\n${issues}\n\nCopy .env.example to .env and fill it in.\n`,
    );
  }
  return parsed.data;
}

export const env = load();

/** Feature flags — voice/LLM providers are optional and fall back gracefully. */
export const hasGroq = () => env.GROQ_API_KEY.length > 0;
export const hasDeepgram = () => env.DEEPGRAM_API_KEY.length > 0;
export const hasCartesia = () =>
  env.CARTESIA_API_KEY.length > 0 && env.CARTESIA_VOICE_ID.length > 0;
