// BudgetAssistant/services/ragService.ts
import { getLlamaContext } from './llamaService';
import { addChatMessage, getChatHistory, getAllDocs } from './dbService';
import { embedText } from './embeddingService';

// --- RAG INTERFACE ---
interface Document {
  id: string;
  text: string;
  embedding: number[];
}

// --- Message INTERFACE ---
interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Calculates the cosine similarity between two vectors.
 * Score closer to 1 means higher similarity.
 */
function cosine(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    // Handle division by zero safety
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dot / denominator;
}

/**
 * Answers a user query by formatting recent chat history into the Gemma chat template
 * and sending it to the Llama context for completion.
 */
export async function answerQuery(
  query: string,
  onPartial?: (chunk: string) => void,
  topK = 3,
  nPredict = 256
): Promise<string> {
  const ctx = getLlamaContext();

  // ----------------------------------------------------
  // 1. RETRIEVAL-AUGMENTATION BLOCK
  // ----------------------------------------------------

  // Step 1: Embed the user's query
  const queryEmbedding = await embedText(query);

  // Step 2: Retrieve all stored documents (chunks) (native SQL vector search if scale?)
  const allDocs: Document[] = await getAllDocs();

  // Step 3: Calculate similarity and select top K
  const scored = allDocs
    // Map each document to an object including its similarity score with the query
    .map((doc) => ({ 
        ...doc, 
        score: cosine(queryEmbedding, doc.embedding) 
    }))
    // Sort in descending order of score (highest similarity first)
    .sort((a, b) => b.score - a.score)
    // Take only the top K documents
    .slice(0, topK);

  // Step 4: Format the retrieved context for the prompt
  const contextText = scored
    .filter(d => d.score > 0.6) // Optional: filter out very irrelevant results
    .map((d, i) => `[Source Chunk ${i + 1} (Score: ${d.score.toFixed(3)}):\n${d.text.slice(0, 500)}]`) 
    .join('\n---\n');

  // ----------------------------------------------------
  // 2. PROMPT AUGMENTATION & COMPLETION BLOCK
  // ----------------------------------------------------

  // Step 1: Load recent conversation history
  const history: ChatMessage[] = await getChatHistory(10);  // last 5 questions and answers

  // Step 2: Set up system instructions
  const systemInstruction = `
You are CornBot, a professional financial data analyst and budget advisor.
Your goal is to help users understand their financial situation, analyze spending patterns, detect trends, and provide practical, data-driven insights.

**CRITICAL RULE: Always use the provided 'FINANCIAL CONTEXT' (if available) to answer the user's question. Do not hallucinate data. If the answer is not in the context, state that the information is missing.**

Rules:
1. Always think step-by-step before giving an answer.
2. Use quantitative reasoning when analyzing numbers (e.g., percentages, averages, deltas).
3. When referencing numbers, always explain what they mean in context.
4. Keep explanations concise but analytical.

Tone:
- Professional, calm, and data-oriented.

Output Format:
- **Summary**: brief overview of the analysis or key findings.
- **Details**: relevant numbers, categories, and comparisons from the context.
- **Recommendation**: clear next steps or financial advice.
`;

  // Step 3: Format the history using Gemma's turn tokens.
  const formattedHistory = history.map((m) => {
    const roleToken = m.role === 'user' ? 'user' : 'model';
    return `<start_of_turn>${roleToken}\n${m.text}<end_of_turn>`;
  }).join('');

  // ----------------------------------------------------------
  // 3. COMBINE EVERYTHING INTO THE FINAL AUGMENTED PROMPT
  // ----------------------------------------------------------

  // Step 1: Create the augmented query with context
  const augmentedQuery = `
FINANCIAL CONTEXT:
---
${contextText || "No relevant financial documents found in the database. Rely only on general financial knowledge."}
---
User question: ${query}
`;

  // Step 2: Combine everything into the final prompt string.
  const prompt = `<bos>${formattedHistory}<start_of_turn>user\n${systemInstruction}\n\n${augmentedQuery}<end_of_turn><start_of_turn>model\n`;

  // ----------------------------------------------------------
  // 4. LLM COMPLETION BLOCK
  // ----------------------------------------------------------

  let buffer = '';
  const flushTokenCount = 5;
  let tokenCounter = 0;
  const stopWords = ['<end_of_turn>', '<start_of_turn>user', '<start_of_turn>model', '[Stopped]'];

  let result;
  try {
    result = await ctx.completion(
      {
        prompt,
        n_predict: nPredict,
        top_p: 0.9,
        top_k: 40,
        temperature: 0.7,
        stop: stopWords,    // Stop at end of turn or new user turn
      },
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
  } catch (error) {
    console.error("LLM completion failed:", error);
    return "Error: Could not get a response from the model.";
  }

  if (buffer.length > 0) onPartial?.(buffer);

  // Clean the reply by removing tokens
  const rawReply = result.text.trim();
  
  let reply = rawReply;
  const userTurnIndex = reply.indexOf('<start_of_turn>user');
  if (userTurnIndex !== -1) {
    reply = reply.substring(0, userTurnIndex);
  }
  reply = reply.replace(/<end_of_turn>|<end_of_text>|\n\n/g, '').trim();

  // Save chat history
  await addChatMessage('user', query);
  await addChatMessage('assistant', reply);

  return reply;
}