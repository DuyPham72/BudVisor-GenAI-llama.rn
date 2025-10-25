// app/screens/SetupScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { initModelsIfNeeded } from '../../services/llamaService';

const DROPBOX_EMBEDDING = 'https://www.dropbox.com/scl/fi/0ckpovmefhaw6fz9ff7p6/embeddinggemma-300M-Q8_0.gguf?dl=1';
const DROPBOX_MODEL = 'https://www.dropbox.com/scl/fi/daegv6rhntiane8w1j1ah/gemma-2-2b-it-abliterated-Q4_K_L.gguf?dl=1';

export default function SetupScreen({ navigation }: { navigation?: any }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    // nothing on mount
  }, []);

  const startSetup = async () => {
    try {
      setLoading(true);
      setStatus('Ensuring models...');
      await initModelsIfNeeded({
        modelUrl: DROPBOX_MODEL,
        embeddingUrl: DROPBOX_EMBEDDING,
        onProgress: (text) => setStatus(text),
      });
      setStatus('Initializing LLM...');
      await initModelsIfNeeded({ initializeOnly: true });
      setLoading(false);
      navigation?.navigate('Chat' as never);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Setup error', err?.message || String(err));
    }
  };

  return (
    <View style={{ flex:1, alignItems: 'center', justifyContent: 'center', padding:20 }}>
      <Text style={{fontSize:18, marginBottom:12}}>Offline RAG Chat — Setup</Text>
      <Text style={{marginBottom:10}}>{status}</Text>
      {loading ? <ActivityIndicator/> : <Button title="Download models & initialize (first launch)" onPress={startSetup} />}
    </View>
  );
}
