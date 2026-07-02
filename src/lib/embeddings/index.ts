import { EmbeddingModel, FlagEmbedding } from "fastembed";
import { env } from "@/lib/env";

/**
 * Local embeddings via fastembed. The default model is BAAI/bge-small-en-v1.5
 * (384-dim), matching the pgvector column. The model (~90MB) downloads once to
 * EMBEDDING_CACHE_DIR on first use; there is no external API and no key.
 *
 * Initialization is lazy + memoized so the model loads on first embed only.
 */
let modelPromise: Promise<FlagEmbedding> | null = null;

function getModel(): Promise<FlagEmbedding> {
  modelPromise ??= FlagEmbedding.init({
    model: EmbeddingModel.BGESmallENV15,
    cacheDir: env.EMBEDDING_CACHE_DIR,
    maxLength: 512,
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
