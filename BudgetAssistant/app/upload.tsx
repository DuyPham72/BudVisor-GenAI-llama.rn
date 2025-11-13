import React, { useState, useCallback } from 'react';
import {  View, Text, Button, Alert, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { embedText } from '../services/embeddingService';
import { addDocument, getAllDocs, deleteDocument, resetRAGDatabase } from '../services/dbService';

// --- Type Definitions for Documents ---
interface Document {
  id: string;
  text: string;
  embedding: number[];
  summary: string;
  chunkCount: number;
}

// --- Text Extraction (SIMPLIFIED) ---
async function extractTextFromFile(uri: string, fileName: string): Promise<string> {
  try {
    const text = await readAsStringAsync(uri, { encoding: 'utf8' });
    if (text.length < 1) throw new Error('File content is empty.');
    return text;
  } catch (err: any) {
    console.error('Error extracting text:', err);
    throw new Error(`Failed to extract text from ${fileName}.`);
  }
}

// --- Chunker groups lines by empty lines ---
function splitTextByEmptyLines(text: string): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0) {
      currentChunk.push(line); 
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = []; 
      }
    }
    if (index === lines.length - 1) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
      }
    }
  });
  return chunks;
}

// --- Main Screen Component ---
const UploadScreen = () => {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>('Ready to select document.');
  const [documents, setDocuments] = useState<Document[]>([]);
  
  const navigation = useNavigation(); 

  // --- Load all documents ---
  const loadDocuments = async () => {
    try {
      const rawDocs = await getAllDocs();
      const displayedDocs: Document[] = rawDocs.map((doc: any) => ({
        id: doc.id,
        text: doc.text,
        embedding: doc.embedding,
        summary: doc.text.substring(0, 50).trim() + '...',
        chunkCount: 1, 
      }));
      setDocuments(displayedDocs);
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  };

  // --- Delete Handler ---
  const handleDelete = async (docId: string) => {
    Alert.alert('Confirm Deletion', 'Are you sure you want to delete this RAG chunk?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(docId);
            Alert.alert('Deleted', 'RAG chunk removed successfully.');
            loadDocuments();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete the chunk.');
          }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, []),
  );

  // --- Upload Handler (SIMPLIFIED) ---
  const handleUpload = async () => {
    setUploading(true);
    setStatus('Selecting file...');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain', 
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        setStatus('Upload cancelled.');
        setUploading(false);
        return;
      }

      const file = result.assets[0];
      const fileName = file.name;
      const fileUri = file.uri;

      setStatus(`Processing: ${fileName}...`);
      const text = await extractTextFromFile(fileUri, fileName);

      setStatus(`Splitting text into line-based chunks...`);
      const chunks = splitTextByEmptyLines(text); 

      if (chunks.length === 0) {
        setStatus('Error: No text chunks created.');
        Alert.alert('Error', 'Text extraction resulted in empty content.');
        setUploading(false);
        return;
      }

      let count = 0;
      const totalChunks = chunks.length;
      for (const chunk of chunks) {
        setStatus(`Embedding chunk ${++count}/${totalChunks}...`);
        const embedding = await embedText(chunk);
        await addDocument(chunk, embedding);
      }

      Alert.alert('✅ Success', `${fileName} (${totalChunks} chunks) processed and embedded.`);
      setStatus('Completed and Ready for Chat.');
      loadDocuments();
    } catch (err: any) {
      console.error('Upload Process Error:', err);
      Alert.alert('Processing Error', err.message || 'Failed to upload or process the file.');
      setStatus('Error occurred.');
    } finally {
      setUploading(false);
    }
  };

  // --- Reset Database Handler ---
  const handleResetRAG = async () => {
    Alert.alert(
      'Confirm Delete All', // Changed title
      'Are you sure you want to delete ALL processed RAG chunks?', // Changed message
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All', // Changed button text
          style: 'destructive',
          onPress: async () => {
            try {
              await resetRAGDatabase();
              Alert.alert('Delete Complete', 'All RAG chunks have been cleared.');
              loadDocuments();
            } catch (e) {
              Alert.alert('Error', 'Failed to reset the RAG database.');
            }
          },
        },
      ],
    );
  };

  // --- Document Renderer ---
  const renderDocument = ({ item, index }: { item: Document; index: number }) => (
    <View style={styles.documentItem}>
      <TouchableOpacity
        style={styles.documentTextContainer}
        activeOpacity={0.7}
        onPress={() =>
          Alert.alert("Chunk Detail", item.text)
        }
      >
        <Text style={styles.documentIndex}>RAG Chunk {index + 1}:</Text>
        <Text style={styles.documentSummary} numberOfLines={2}>
          {item.summary}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Upload Data</Text>
        </View>
        
        <ScrollView 
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.uploadSection}>
            {uploading ? (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.statusTextProgress}>{status}</Text>
              </View>
            ) : (
              <Button
                title="Select Document (.txt only)" 
                onPress={handleUpload}
                color="#4F46E5"
              />
            )}
          </View>

          <View style={styles.separator} />
          
          <View style={styles.listHeaderContainer}>
            <Text style={styles.listHeader}>Processed RAG Chunks ({documents.length})</Text>
            <TouchableOpacity onPress={handleResetRAG} style={styles.deleteAllButton}>
              <Ionicons name="trash-outline" size={22} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={documents}
            renderItem={renderDocument}
            keyExtractor={(item) => item.id} 
            style={styles.list}
            scrollEnabled={false} // Disable FlatList scrolling, let ScrollView handle it
            ListEmptyComponent={<Text style={styles.emptyText}>No documents processed yet.</Text>}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export default UploadScreen;

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#f7f7f7' 
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20, 
    paddingTop: 8,
    paddingBottom: 80,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  uploadSection: {
    marginBottom: 10,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressContainer: { alignItems: 'center' },
  statusTextProgress: { marginTop: 15, color: '#007AFF', textAlign: 'center', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 15 },
  listHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listHeader: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#4a4a4a' 
  },
  deleteAllButton: {
    padding: 4,
  },
  list: { 
    flexGrow: 0,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 5,
  },
  documentTextContainer: { flex: 1, marginRight: 10 },
  documentIndex: { fontSize: 12, fontWeight: '600', color: '#8e8e93' },
  documentSummary: { fontSize: 14, color: '#1c1c1e' },
  actionButton: { padding: 8 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#8e8e93' },
});