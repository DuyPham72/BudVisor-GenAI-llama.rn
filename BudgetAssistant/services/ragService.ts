// services/ragService.ts
import { getLlamaContext } from './llamaService';
// import * as db from './dbService';
// import { embedText } from './embeddingService';

// interface Document {
//   id: string;
//   text: string;
//   embedding: number[];
// }

// function cosine(a: number[], b: number[]): number {
//   let dot = 0, normA = 0, normB = 0;
//   for (let i = 0; i < a.length; i++) {
//     dot += a[i] * b[i];
//     normA += a[i] * a[i];
//     normB += b[i] * b[i];
//   }
//   return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-12);
// }

// export async function addDocumentAndEmbed(text: string): Promise<string> {
//   const embedding = await embedText(text);
//   const id = await db.addDocument(text, embedding);
//   return id;
// }

export async function answerQuery(
  query: string,
  onPartial?: (chunk: string) => void,
  // topK = 3,
  nPredict = 256
): Promise<string> {
  const ctx = getLlamaContext();
  // const allDocs: Document[] = await db.getAllDocs();

  // const queryEmbedding = await embedText(query);

  // const scored = allDocs
  //   .map((doc) => ({ ...doc, score: cosine(queryEmbedding, doc.embedding) }))
  //   .sort((a, b) => b.score - a.score)
  //   .slice(0, topK);

  // const contextText = scored
  //   .map((d, i) => `Doc ${i + 1}: ${d.text.slice(0, 500)}`) // truncate
  //   .join('\n\n');

  const prompt = `You are a helpful assistant. Answer the user's question as accurately as possible. Format your response in short but keep all the details.
User question: ${query}
Assistant: `;

  // Retrieved context:
  // ${contextText}

  let buffer = '';
  const flushTokenCount = 5;
  let tokenCounter = 0;

  const result = await ctx.completion(
    { prompt, n_predict: nPredict, top_p: 0.9, temperature: 0.7 },
    (data) => {
      if (!data?.token) return;
      buffer += data.token;
      tokenCounter++;
      if (tokenCounter >= flushTokenCount) {
        onPartial?.(buffer);
        buffer = '';
        tokenCounter = 0;
      }
    }
  );

  if (buffer.length > 0) onPartial?.(buffer);
  return result.text;
}
