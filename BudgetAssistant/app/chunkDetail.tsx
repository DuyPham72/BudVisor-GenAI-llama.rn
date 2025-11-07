// BudgetAssistant/app/chunkDetail.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChunkDetailScreen() {
  const params = useLocalSearchParams();
  const chunkText = (params.chunkText as string) || 'No text found.';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.chunkText}>{chunkText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  scrollView: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
  },
  chunkText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});
