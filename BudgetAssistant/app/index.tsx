// BudgetAssistant/app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import RNFS from 'react-native-fs';
import { initModelsIfNeeded } from '../services/llamaService';
import { clearChatMemory } from '../services/dbService';
import { ingestInitialDataIfNeeded } from '../services/dataIngestionService';

const MODEL_FILE = RNFS.DocumentDirectoryPath + '/models/granite-4.0-1b-Q5_K_M.gguf';
const EMBEDDING_FILE = RNFS.DocumentDirectoryPath + '/models/embeddinggemma-300m-Q4_0.gguf';

const MODEL_URL = 'https://huggingface.co/unsloth/granite-4.0-1b-GGUF/resolve/main/granite-4.0-1b-Q5_K_M.gguf';
const EMBEDDING_URL = 'https://huggingface.co/unsloth/embeddinggemma-300m-GGUF/resolve/main/embeddinggemma-300m-Q4_0.gguf';

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
      const modelExists = await RNFS.exists(MODEL_FILE);
      const embeddingExists = await RNFS.exists(EMBEDDING_FILE);

      // 1. We always want to init models, even if they exist
      if (modelExists && embeddingExists) {
        setStatus('Initializing models...');
        await initModelsIfNeeded({ initializeOnly: true, onProgress: handleProgress });
      } else {
        setStatus('Downloading missing components...');

        await initModelsIfNeeded({
          modelUrl: MODEL_URL,
          embeddingUrl: EMBEDDING_URL,
          onProgress: handleProgress,
        });
        setStatus('Initializing models...');
        await initModelsIfNeeded({ initializeOnly: true, onProgress: handleProgress });
      }

      // 2. Ingest initial data (This will only run once, on the first-ever app start)
      await ingestInitialDataIfNeeded(setStatus);

      // 3. Clear old chats and navigate
      await clearChatMemory(); 
      router.replace('./App');

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
        Welcome to the Offline Budget AI Agent!
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