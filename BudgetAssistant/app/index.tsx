// BudgetAssistant/app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import RNFS from 'react-native-fs';
import { initModelsIfNeeded } from '../services/llamaService';
import { clearChatMemory } from '../services/dbService';
import { ingestInitialDataIfNeeded } from '../services/dataIngestionService';

const REWRITE_MODEL_FILE = RNFS.DocumentDirectoryPath + '/models/granite-4.0-1b-Q4_K_M.gguf';
const MODEL_FILE = RNFS.DocumentDirectoryPath + '/models/granite-4.0-micro-Q4_K_M.gguf';
const EMBEDDING_FILE = RNFS.DocumentDirectoryPath + '/models/nomic-embed-text-v1.5.Q4_K_M.gguf';

const REWRITE_MODEL_URL = 'https://www.dropbox.com/scl/fi/hwm6kxtxmnm1x0zt1jge3/granite-4.0-1b-Q4_K_M.gguf?rlkey=2i5t2i60p451fh4n0z0x6k9qp&st=g5hqgua1&dl=1';
const MODEL_URL = 'https://www.dropbox.com/scl/fi/zlz2ftlirzto2ap4r2lig/granite-4.0-micro-Q4_K_M.gguf?rlkey=fihw3zpkjicagh1l042k9i5nc&st=dnrqv2zu&dl=1';
const EMBEDDING_URL = 'https://www.dropbox.com/scl/fi/faf0p70wll19dsei24wfn/nomic-embed-text-v1.5.Q4_K_M.gguf?rlkey=1ridq6tv9r56dgrfgj6rfdelm&st=inklelqr&dl=1';

export default function SetupWelcome() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Checking models...');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); 
  const router = useRouter();

  const checkAndInit = async () => {
    setError(null);
    setLoading(true);
    setProgress(0); 

    const handleProgress = (text: string) => {
      setStatus(text); 
      const match = text.match(/(\d+)%/);
      if (match && match[1]) {
          setProgress(parseInt(match[1], 10));
      } else if (text.includes('downloaded') || text.includes('exists')) {
          setProgress(0);
      } else if (text.includes('Initializing...')) {
          setProgress(0); 
      }
    };

    try {
      const rewriteModelExists = await RNFS.exists(REWRITE_MODEL_FILE);
      const modelExists = await RNFS.exists(MODEL_FILE);
      const embeddingExists = await RNFS.exists(EMBEDDING_FILE);

      // We always want to init models, even if they exist
      if (modelExists && embeddingExists && rewriteModelExists) {
        setStatus('Initializing models...');
        await initModelsIfNeeded({ initializeOnly: true, onProgress: handleProgress });
      } else {
        setStatus('Downloading missing components...');
        // ⬇️ UPDATE THIS OBJECT ⬇️
        await initModelsIfNeeded({
          rewriteModelUrl: REWRITE_MODEL_URL,
          modelUrl: MODEL_URL,
          embeddingUrl: EMBEDDING_URL,
          onProgress: handleProgress,
        });
        setStatus('Initializing models...');
        await initModelsIfNeeded({ initializeOnly: true, onProgress: handleProgress });
      }

      // ⬅️ 2. NEW STEP: Ingest initial data
      // This will only run once, on the first-ever app start
      await ingestInitialDataIfNeeded(setStatus);

      // ⬅️ 3. Clear old chats and navigate
      await clearChatMemory(); 
      router.replace('./upload');

    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unknown error');
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAndInit();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20, textAlign: 'center' }}>
        Welcome to the Offline Chat App!
      </Text>
      <Text style={{ marginBottom: 10, textAlign: 'center' }}>
        {error ? `Error: ${error}` : status}
      </Text>

      {loading && <ActivityIndicator size="large" style={{ marginVertical: 20 }} />}
      
      {error && !loading && (
        <Button title="Retry Setup" onPress={checkAndInit} />
      )}
    </View>
  );
}