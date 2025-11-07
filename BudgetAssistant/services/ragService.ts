// BudgetAssistant/services/ragService.ts
import { getChatContext, getRewriterContext } from './llamaService';
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

export async function answerQuery(
  query: string,
  onPartial?: (chunk: string) => void,
  topK = 2,
  nPredict = 256
): Promise<string> {

  // ----------------------------------------------------
  // 1. PRE-RAG: HISTORY & QUERY REWRITING BLOCK 🧠
  // ----------------------------------------------------

  // Step 1: Load recent conversation history (needed for rewriting & final prompt)
  const history: ChatMessage[] = await getChatHistory(2); // last 1 Q&A pairs

  // ⬇️ NEW BLOCK START: Query Rewriting ⬇️
  let retrievalQuery = query;
  const vagueWords = /\b(that|this|it|those|these|him|her|them|that one|those ones)\b/i;
  const isVague = vagueWords.test(query) || query.length < 25;

  // ONLY rewrite if history exists AND the query is vague
  if (history.length > 0 && isVague) {
    console.log('Vague query detected, attempting query rewrite...');
    const historyForRewrite = history
      .map((m) => `${m.role}: ${m.text}`)
      .join('\n');

    // A prompt specifically for rewriting the query
    const rewritePrompt = `<bos><start_of_turn>user
You are a query rewriter. Given a chat history and a new user question, rewrite the user question to be a standalone, self-contained question that incorporates all necessary context from the history.

Rules:
- If the user question is already self-contained, return it as-is.
- Otherwise, rephrase it, adding context (like dates, topics, names) from the history.
- **Respond with ONLY the rewritten query and nothing else.**

Chat History:
${historyForRewrite}

User Question: ${query}
<end_of_turn><start_of_turn>model
Rewritten Question: `;

    try {
      // 1. Get the FAST rewriter model
      const rewriteCtx = getRewriterContext(); 
      
      // 2. Use it to rewrite the query
      const rewriteResult = await rewriteCtx.completion({
        prompt: rewritePrompt,
        n_predict: 128, // Don't need a long answer
        stop: ['<end_of_turn>', '\n'],
        temperature: 0.0, // Be deterministic
      });
      
      const rewritten = rewriteResult.text.trim().replace(/["']/g, '');
      
      if (rewritten.length > 10) { // Safety check
        retrievalQuery = rewritten;
      }
      console.log(`Original Query: "${query}"`);
      console.log(`Retrieval Query: "${retrievalQuery}"`);

    } catch (e) {
      console.error('Query rewrite failed:', e);
      // If rewrite fails, just use the original query
      retrievalQuery = query;
      console.log('Rewrite failed, using original query for retrieval.');
    }
  }

  // ----------------------------------------------------
  // 2. RETRIEVAL-AUGMENTATION BLOCK
  // ----------------------------------------------------

  // Step 1: Embed the query (using rewritten query if applicable)
  const queryEmbedding = await embedText(retrievalQuery);

  // Step 2: Retrieve all stored documents (chunks)
  const allDocs: Document[] = await getAllDocs();

  // Step 3: Calculate similarity and select top K
  const scored = allDocs
    .map((doc) => ({ 
        ...doc, 
        score: cosine(queryEmbedding, doc.embedding) 
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Step 4: Format the retrieved context for the prompt
  const contextText = scored
    .map((d, i) => `[Source Chunk ${i + 1} (Score: ${d.score.toFixed(3)}):\n${d.text.slice(0, 1000)}]`) 
    .join('\n---\n');

  // ----------------------------------------------------
  // 3. PROMPT AUGMENTATION & COMPLETION BLOCK
  // ----------------------------------------------------

  // Step 1: Define system instructions
  const systemInstruction = `
You are CornBot, a financial analyst. Provide practical, data-driven insights.
Rules: Be concise, analytical, and round floats to 2 decimals. Answer in 250 words or less.
Format:
- **Summary**: [brief summary]
- **Details**: [numbers, details]
- **Recommendation**: [advice]
`;

  // Step 2: Format the chat history
  const formattedHistory = history.map((m) => {
    const roleToken = m.role === 'user' ? 'user' : 'model';
    return `<start_of_turn>${roleToken}\n${m.text}<end_of_turn>`;
  }).join('');

  // Step 3: Create the augmented query with context
  const augmentedQuery = `
FINANCIAL CONTEXT:
---
${contextText || "No relevant financial documents found in the database. Rely only on general financial knowledge."}
---
User question: ${query}
`;

  // Step 4: FIX: Inject System Instruction ONLY if this is the FIRST turn.
  const userContent = history.length === 0 
    ? `${systemInstruction}\n\n${augmentedQuery}`
    : augmentedQuery;

  // Step 5: Combine everything into the final prompt string.
  const prompt = `<bos>${formattedHistory}<start_of_turn>user\n${userContent}<end_of_turn><start_of_turn>model
`;

  // ----------------------------------------------------------
  // 4. LLM COMPLETION BLOCK
  // ----------------------------------------------------------

  let buffer = '';
  const flushTokenCount = 1;
  let tokenCounter = 0;
  const stopWords = ['<end_of_turn>', '<start_of_turn>user', '<start_of_turn>model', '[Stopped]'];

  const ctx = getChatContext();
  let result;
  try {
    result = await ctx.completion(
      {
        prompt,
        n_predict: nPredict,
        top_p: 0.95,
        top_k: 64,
        temperature: 0.3,
        min_p: 0.02,
        stop: stopWords, 
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