// app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import RNFS from 'react-native-fs';
import { initModelsIfNeeded } from '../services/llamaService';

const MODEL_FILE = RNFS.DocumentDirectoryPath + '/models/gemma-3-1b-it-q4_0.gguf';
const EMBEDDING_FILE = RNFS.DocumentDirectoryPath + '/models/embeddinggemma-300m-Q4_0.gguf';

const MODEL_URL = 'https://www.dropbox.com/scl/fi/29ibpsl2wjzh4ed4ufl7k/gemma-3-1b-it-q4_0.gguf?rlkey=1etghy080szoqzzgi7pl4g023&st=hcr4thes&dl=1';
const EMBEDDING_URL = 'https://www.dropbox.com/scl/fi/k52v2hvv0nb400gsw02yp/embeddinggemma-300m-Q4_0.gguf?rlkey=ajxtfwaic56m04qbyua357p65&st=ng4ee5lp&dl=1';

export default function SetupWelcome() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Checking models...');
  const router = useRouter();

  useEffect(() => {
    const checkAndInit = async () => {
      try {
        const modelExists = await RNFS.exists(MODEL_FILE);
        const embeddingExists = await RNFS.exists(EMBEDDING_FILE);

        if (modelExists && embeddingExists) {
          setStatus('Initializing LLaMA...');
          await initModelsIfNeeded({ initializeOnly: true });
          router.replace('./chat');
        } else {
          // Automatically start download if files are missing
          setStatus('Downloading missing models...');
          await initModelsIfNeeded({
            modelUrl: MODEL_URL,
            embeddingUrl: EMBEDDING_URL,
            onProgress: (text) => setStatus(text),
          });
          setStatus('Initializing LLaMA...');
          await initModelsIfNeeded({ initializeOnly: true });
          router.replace('./chat');
        }
      } catch (err: any) {
        setLoading(false);
        Alert.alert('Setup error', err?.message || String(err));
      }
    };

    checkAndInit();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20, textAlign: 'center' }}>
        Welcome to the Offline Chat App!
      </Text>
      <Text style={{ marginBottom: 10, textAlign: 'center' }}>{status}</Text>
      {loading && <ActivityIndicator size="large" />}
    </View>
  );
}