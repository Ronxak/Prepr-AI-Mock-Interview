import type { FlagEmbedding } from "fastembed";
import { env } from "@/lib/env";

/**
 * Local embeddings via fastembed. The default model is BAAI/bge-small-en-v1.5
 * (384-dim), matching the pgvector column. The model (~90MB) downloads once to
 * EMBEDDING_CACHE_DIR on first use; there is no external API and no key.
 *
 * fastembed is imported dynamically (not at the top level) on purpose: it pulls
 * in onnxruntime-node's native binary, whose dlopen runs at module-load time. A
 * static import would trigger that at cold start for every route that transitively
 * imports this file (the whole interview flow does, via resume.service), crashing
 * routes that never embed anything — and on serverless hosts where the native .so
 * isn't bundled, it crashes *before* callers' try/catch can see it. Loading it
 * lazily means only real embed() calls touch onnxruntime, and those call sites
 * already degrade gracefully when it's unavailable.
 *
 * Initialization is lazy + memoized so the model loads on first embed only.
 */
let modelPromise: Promise<FlagEmbedding> | null = null;

function getModel(): Promise<FlagEmbedding> {
  modelPromise ??= (async () => {
    const { EmbeddingModel, FlagEmbedding } = await import("fastembed");
    return FlagEmbedding.init({
      model: EmbeddingModel.BGESmallENV15,
      cacheDir: env.EMBEDDING_CACHE_DIR,
      maxLength: 512,
    });
  })().catch((err) => {
    // Reset so a later call can retry (e.g. after a transient cold download).
    modelPromise = null;
    throw err;
  });
  return modelPromise;
}

export const EMBEDDING_DIM = 384;

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = await getModel();
  const out: number[][] = [];
  for await (const batch of model.embed(texts, 32)) {
    for (const vec of batch) out.push(Array.from(vec));
  }
  return out;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  return vec ?? [];
}

/** pgvector literal, e.g. "[0.12,-0.03,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
