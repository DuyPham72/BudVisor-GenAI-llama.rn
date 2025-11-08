// BudgetAssistant/services/llamaService.ts
import RNFS from 'react-native-fs';
import { initLlama, LlamaContext } from 'llama.rn';

let rewriterContext: LlamaContext | null = null;
let chatContext: LlamaContext | null = null;
let embeddingContext: LlamaContext | null = null;

const MODEL_DIR = RNFS.DocumentDirectoryPath + '/models';
const REWRITE_MODEL_FILE = MODEL_DIR + '/granite-4.0-350m-Q8_0.gguf';
const MODEL_FILE = MODEL_DIR + '/granite-4.0-1b-Q8_0.gguf';
const EMBEDDING_FILE = MODEL_DIR + '/embeddinggemma-300M-Q8_0.gguf';

export async function initModelsIfNeeded(opts?: {
  rewriteModelUrl?: string;
  modelUrl?: string;
  embeddingUrl?: string;
  initializeOnly?: boolean;
  onProgress?: (msg: string) => void;
}) {
  const { modelUrl, embeddingUrl, rewriteModelUrl, initializeOnly, onProgress } = opts || {};

  await RNFS.mkdir(MODEL_DIR).catch(() => {});

  if (!initializeOnly) {
    if (modelUrl) {
      await ensureDownload(modelUrl, MODEL_FILE, (p) =>
        onProgress?.(`model: ${p}`)
      );
    }
    if (embeddingUrl) {
      await ensureDownload(embeddingUrl, EMBEDDING_FILE, (p) =>
        onProgress?.(`embedding: ${p}`)
      );
    }
    if (rewriteModelUrl) {
      await ensureDownload(rewriteModelUrl, REWRITE_MODEL_FILE, (p) =>
        onProgress?.(`rewriter: ${p}`)
      );
    }
  }

  if (!chatContext) {
    onProgress?.('Initializing The App (this may take a while)...');
    const modelUri = 'file://' + MODEL_FILE;

    chatContext = await initLlama({
      model: modelUri,
      use_mlock: false, // safe for Android
      n_ctx: 2048,       // medium context
      n_batch: 512,       // faster token generation
      n_threads: 6,     // use 4 threads in Pixel 8
    });
  }

  if (!embeddingContext) {
    onProgress?.('Initializing Components...');
    const embeddingModelUri = 'file://' + EMBEDDING_FILE;

    embeddingContext = await initLlama({
      model: embeddingModelUri,
      use_mlock: false, // safe for Android
      n_ctx: 2048,       // medium context
      n_batch: 512,       // faster token generation
      n_threads: 6,     // use 4 threads in Pixel 8
      embedding: true,  // embedding enabled
    });
  }

  if (!rewriterContext) {
    onProgress?.('Initializing Services...');
    const rewriterModelUri = 'file://' + REWRITE_MODEL_FILE;

    rewriterContext = await initLlama({
      model: rewriterModelUri,
      use_mlock: false, 
      n_ctx: 1024,      // Smaller context, as it only rewrites
      n_batch: 512,
      n_threads: 6,     // Fewer threads, as it's a simple task
    });
  }

  return true;
}

async function ensureDownload(
  url: string,
  dest: string,
  onProgress?: (p: string) => void
) {
  const exists = await RNFS.exists(dest);
  if (exists) {
    onProgress?.('exists');
    return;
  }

  onProgress?.('downloading...');
  const tmp = dest + '.tmp';

  const ret = RNFS.downloadFile({
    fromUrl: url,
    toFile: tmp,
    progressInterval: 1000,
    progress: (res) => {
      const pct = Math.round((res.bytesWritten / res.contentLength) * 100);
      onProgress?.(`${pct}%`);
    },
  });

  const res = await ret.promise;
  if (res.statusCode === 200 || res.statusCode === 201) {
    await RNFS.moveFile(tmp, dest);
    onProgress?.('downloaded');
  } else {
    throw new Error('Download failed with status ' + res.statusCode);
  }
}

export function getChatContext() {
  if (!chatContext) throw new Error('Chat not initialized');
  return chatContext;
}

export function getEmbeddingContext() {
  if (!embeddingContext) throw new Error('Embedding not initialized');
  return embeddingContext;
}

export function getRewriterContext() {
  if (!rewriterContext) throw new Error('Rewriter not initialized');
  return rewriterContext;
}