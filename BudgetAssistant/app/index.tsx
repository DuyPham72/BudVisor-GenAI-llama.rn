// BudgetAssistant/app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import RNFS from 'react-native-fs';
import { initModelsIfNeeded } from '../services/llamaService';
import { clearChatMemory } from '../services/dbService';

const MODEL_FILE = RNFS.DocumentDirectoryPath + '/models/granite-4.0-micro-Q4_K_M.gguf';
const EMBEDDING_FILE = RNFS.DocumentDirectoryPath + '/models/embeddinggemma-300M-Q8_0.gguf';

const MODEL_URL = 'https://www.dropbox.com/scl/fi/zlz2ftlirzto2ap4r2lig/granite-4.0-micro-Q4_K_M.gguf?rlkey=fihw3zpkjicagh1l042k9i5nc&st=dnrqv2zu&dl=1';
const EMBEDDING_URL = 'https://www.dropbox.com/scl/fi/8hvid7cowueymzimualld/embeddinggemma-300M-Q8_0.gguf?rlkey=pkwta11p8ycmsgd3oehfu9gta&st=46n4iqin&dl=1';

export default function SetupWelcome() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Checking models...');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const checkAndInit = async () => {
    setError(null);
    setLoading(true);
    try {
      const modelExists = await RNFS.exists(MODEL_FILE);
      const embeddingExists = await RNFS.exists(EMBEDDING_FILE);

      if (modelExists && embeddingExists) {
        setStatus('Initializing...');
        await initModelsIfNeeded({ initializeOnly: true });
        await clearChatMemory(); // 🧹 forget previous chat session
        router.replace('./upload');
      } else {
        setStatus('Downloading missing components...');
        await initModelsIfNeeded({
          modelUrl: MODEL_URL,
          embeddingUrl: EMBEDDING_URL,
          onProgress: (text) => setStatus(text),
        });
        setStatus('Initializing...');
        await initModelsIfNeeded({ initializeOnly: true });
        await clearChatMemory(); // 🧹 clear memory after setup
        router.replace('./upload');
      }
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