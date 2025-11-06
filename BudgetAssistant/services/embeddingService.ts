// BudgetAssistant/services/embeddingService.ts
import { getEmbeddingContext } from './llamaService';

export async function embedText(text: string): Promise<number[]> {
  const ctx = getEmbeddingContext();
  // llama.rn returns an object; exact return shape may vary; this matches README `context.embedding(content)`
  const res = await ctx.embedding(text);
  // assume res.embedding is Float32Array or number[]
  if (res && (res.embedding || res.embedding)) {
    const vec = (res.embedding || res.embedding) as number[] | Float32Array;
    return Array.from(vec as any);
  }
  // fallback: if returns plain array
  if (Array.isArray(res)) return res as number[];
  throw new Error('Unexpected embedding response');
}
