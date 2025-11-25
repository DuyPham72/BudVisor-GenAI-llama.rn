// BudgetAssistant/services/ragService.ts
import { getChatContext } from './llamaService';
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
  role: 'user' | 'assistant' | 'system';
  text: string;
}

// --------------- COSINE SIMILARITY FUNCTION ----------------
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
  topK = 3, // Increased slightly for Granite context window
  nPredict = 512
): Promise<string> {
  // Log start time
  const t0 = Date.now();

  console.log(`PRE-RAG: HISTORY & QUERY REWRITING BLOCK`);
  // ----------------------------------------------------
  // 1. PRE-RAG: HISTORY & QUERY REWRITING BLOCK 🧠
  // ----------------------------------------------------

  // Step 1: Load recent conversation history
  const history: ChatMessage[] = await getChatHistory(4); // Increased history slightly

  // Step 2: Query Rewriting (if needed)
  let retrievalQuery = query;
  const vagueWords = /\b(that|this|it|those|these|him|her|them|that one|those ones)\b/i;
  const isVague = vagueWords.test(query);

  // Log history retrieve time of step 1
  const t1_rewrite = Date.now();
  console.log(`History Retrieve: ${t1_rewrite - t0}ms`);

  // ONLY rewrite if history exists AND the query is vague
  if (history.length > 0 && isVague) {
    console.log('Vague query detected, attempting query rewrite...');
    
    // Format history for the rewriter using Granite format just to be safe/consistent
    const historyForRewrite = history
      .map((m) => `[${m.role.toUpperCase()}]: ${m.text.replace(/\n/g, ' ')}`)
      .join('\n');

    // Granite 4.0 Prompt for Rewriting
    const rewritePrompt = `
<|start_of_role|>system<|end_of_role|>You are a query rewriter. Your task is to rewrite the "User Question" to be a complete, standalone question. <|end_of_text|>
<|start_of_role|>user<|end_of_role|>
Chat History:
${historyForRewrite}

User Question: ${query}<|end_of_text|>
<|start_of_role|>assistant<|end_of_role|>Rewritten Question:`;

    try {
      // 1. Get the FAST rewriter model
      const rewriteCtx = getChatContext(); 
      
      // 2. Use it to rewrite the query
      const rewriteResult = await rewriteCtx.completion({
        prompt: rewritePrompt,
        n_predict: 64,
        stop: ['<|end_of_text|>', '\n', '<|start_of_role|>'], // Granite Stop Tokens
        temperature: 0.0,
      });
      
      const rewritten = rewriteResult.text.trim().replace(/["']/g, '');
      
      if (rewritten.length > 5) { // Safety check
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

  // Log step 2 time
  const t2_rewrite = Date.now();
  console.log(`Query Rewrite: ${t2_rewrite - t1_rewrite}ms`);

  console.log(`RETRIEVAL-AUGMENTATION BLOCK`);
  // ----------------------------------------------------
  // 2. RETRIEVAL-AUGMENTATION BLOCK
  // ----------------------------------------------------

  // Step 1: Embed the query (using rewritten query if applicable)
  const t1_embed = Date.now();
  const queryEmbedding = await embedText(retrievalQuery);

  // Log query embedding time of step 2
  const t2_embed = Date.now();
  console.log(`Query Embedding: ${t2_embed - t1_embed}ms`);

  // Step 2: Retrieve all stored documents (chunks)
  const t1_search = Date.now();
  const allDocs: Document[] = await getAllDocs();

  // Step 3: Calculate similarity and select top K
  const threshold = 0.45;
  const scored = allDocs
    .map((doc) => ({ 
        ...doc, 
        score: cosine(queryEmbedding, doc.embedding) 
    }))
    .filter(doc => doc.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Log step 2 time
  const t2_search = Date.now();
  console.log(`DB Search & Score: ${t2_search - t1_search}ms`);

  // Log score of retrieved docs
  console.log(`[RAG DEBUG] Top ${topK} doc scores (before filtering):`);
  scored.forEach((doc, i) => {
    console.log(`  Rank ${i + 1}: Score ${doc.score.toFixed(4)}, Text: "${doc.text.slice(0, 50)}..."`);
  });

  console.log(`PROMPT AUGMENTATION & COMPLETION BLOCK`);
  // ----------------------------------------------------
  // 3. PROMPT AUGMENTATION & COMPLETION BLOCK
  // ----------------------------------------------------

  // Step 1: Format Documents using Granite 4.0 XML JSON format
  // Manual format: <documents>{"doc_id": 1, "title": "...", "text": "..."}{"doc_id": 2...}</documents>
  let documentsXmlString = "";
  if (scored.length > 0) {
    const docJsonList = scored.map((d, i) => {
      return JSON.stringify({
        doc_id: i + 1,
        title: "Financial Transaction Record", 
        text: d.text,
        source: "kaesi.json"
      });
    }).join('');
    documentsXmlString = `<documents>${docJsonList}</documents>`;
  }

  // Step 2: Construct System Prompt
  // Granite requires the system prompt to explicitly mention access to documents if they exist.
  let systemPromptContent = `You are BudVisor, a financial analyst. Provide practical, data-driven insights.
Rules:
1. Round all money to 2 decimal places ($XX.XX).
2. Be concise and professional.

Format:
**Summary**: [brief summary]
**Details**: [numbers, details]
**Recommendation**: [advice]`;

  if (documentsXmlString) {
    // Append the standard Granite RAG boilerplate
    systemPromptContent += ` You are a helpful assistant with access to the following documents. You may use one or more documents to assist with the user query. You are given a list of documents within <documents></documents> XML tags:${documentsXmlString} Write the response to the user's input by strictly aligning with the facts in the provided documents. If the information needed to answer the question is not available in the documents, inform the user that the question cannot be answered based on the available data.`;
  } else {
      systemPromptContent += ` No relevant financial documents found. Answer based on general financial knowledge only.`;
  }

  // Step 3: Build the Full Prompt using Granite Tags
  // <|start_of_role|>system<|end_of_role|>...<|end_of_text|>
  // <|start_of_role|>user<|end_of_role|>...<|end_of_text|>
  // <|start_of_role|>assistant<|end_of_role|>...<|end_of_text|>

  let prompt = `<|start_of_role|>system<|end_of_role|>${systemPromptContent}<|end_of_text|>`;

  // Append History
  history.forEach(msg => {
    prompt += `<|start_of_role|>${msg.role}<|end_of_role|>${msg.text}<|end_of_text|>`;
  });

  // Append Current User Query
  prompt += `<|start_of_role|>user<|end_of_role|>${query}<|end_of_text|>`;
  
  // Append Start of Assistant Generation
  prompt += `<|start_of_role|>assistant<|end_of_role|>`;

  console.log(`LLM COMPLETION BLOCK`);
  // ----------------------------------------------------------
  // 4. LLM COMPLETION BLOCK
  // ----------------------------------------------------------

  const t1_completion = Date.now();
  let t_first_token = 0;
  let buffer = '';
  const flushTokenCount = 1;
  let tokenCounter = 0;

  // Granite 4.0 Stop Words
  const stopWords = ['<|end_of_text|>', '<|end_of_role|>', '<|start_of_role|>'];

  const ctx = getChatContext();
  let result;
  try {
    result = await ctx.completion(
      {
        prompt,
        n_predict: nPredict,
        top_p: 0.95,
        top_k: 40,
        temperature: 0.0,
        stop: stopWords, 
      },
      (data) => {
        if (!data?.token) return;

        // Log time to first token in step 4
        if (t_first_token === 0) {
          t_first_token = Date.now();
          console.log(`Time to First Token: ${t_first_token - t1_completion}ms`);
        }

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

  // Log step 4 time
  const t2_completion = Date.now();
  console.log(`Main Completion: ${t2_completion - t1_completion}ms`);

  if (buffer.length > 0) onPartial?.(buffer);

  // Clean the reply by removing tokens
  // Granite sometimes outputs the tool_response tags if confused, so we strip those too just in case
  let reply = result.text;
  
  // Cleanup logic
  reply = reply
    .replace(/<\|.*?\|>/g, '') // remove all special tokens like <|end_of_text|>
    .replace(/<documents>.*?<\/documents>/gs, '') // Should not happen in output, but safety first
    .trim();
  
  // Save chat history
  await addChatMessage('user', query);
  await addChatMessage('assistant', reply);

  // Log total time
  const t_end = Date.now();
  console.log(`[--- TOTAL TIME: ${t_end - t0}ms ---`);

  return reply;
}