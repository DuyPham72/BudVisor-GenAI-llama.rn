// services/llamaService.ts
import RNFS from 'react-native-fs';
import { initLlama, LlamaContext } from 'llama.rn';

let llamaContext: LlamaContext | null = null;

const MODEL_DIR = RNFS.DocumentDirectoryPath + '/models';
const MODEL_FILE = MODEL_DIR + '/gemma-3-1b-it-q4_0.gguf';
const EMBEDDING_FILE = MODEL_DIR + '/embeddinggemma-300m-Q4_0.gguf';

export async function initModelsIfNeeded(opts?: {
  modelUrl?: string;
  embeddingUrl?: string;
  initializeOnly?: boolean;
  onProgress?: (msg: string) => void;
}) {
  const { modelUrl, embeddingUrl, initializeOnly, onProgress } = opts || {};

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
  }

  if (!llamaContext) {
    onProgress?.('Initializing LLaMA (this may take a while)...');
    const modelUri = 'file://' + MODEL_FILE;

    llamaContext = await initLlama({
      model: modelUri,
      use_mlock: false, // safe for Android
      n_ctx: 512,       // smaller context
      n_batch: 4,       // faster token generation
      embedding: true,  // embedding enabled
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

export function getLlamaContext() {
  if (!llamaContext) throw new Error('LLaMA not initialized');
  return llamaContext;
}
