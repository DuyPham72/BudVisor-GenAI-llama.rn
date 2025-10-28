// BudgetAssistant/app/upload.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, Button, Alert, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { embedText } from '../services/embeddingService';
import { addDocument, getAllDocs, deleteDocument } from '../services/dbService'; // <-- Assumes deleteDocument is now in dbService.ts

// --- Type Definitions for Documents ---
interface Document {
    id: string;
    text: string;
    embedding: number[];  // Vector embedding
    summary: string;      // First 50 chars for display
    chunkCount: number;   // Number of chunks (for display)
}

// --- Text Extraction (Fix Applied) ---
async function extractTextFromFile(uri: string, fileName: string): Promise<string> {
    const isPDF = fileName.toLowerCase().endsWith('.pdf');
    
    if (isPDF) {
        Alert.alert(
            "PDF Note", 
            "PDF extraction is highly unreliable in Expo. We are using a basic fallback, which may not get all text. TXT/JSON is recommended for accuracy.", 
            [{ text: "OK" }]
        );
    }

    try {
        // FIX APPLIED HERE: Using string literal 'utf8'
        const text = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' }); 
        
        if (text.length < 10) {
            throw new Error("File content is too short or empty after reading.");
        }
        return text;
    } catch (err) {
        console.error('Error extracting text:', err);
        throw new Error(`Failed to extract text from ${fileName}. The file might be encrypted, image-based, or corrupted.`);
    }
}

// Split text into manageable chunks for embedding
function splitTextIntoChunks(text: string, chunkSize = 512): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks.filter(chunk => chunk.trim().length > 0);
}

export default function UploadScreen() {
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string>('Ready to select document.');
    const [documents, setDocuments] = useState<Document[]>([]);
    const router = useRouter();

    // --- Data Fetching Logic ---
    const loadDocuments = async () => {
        try {
            const rawDocs = await getAllDocs();
            
            // Transform raw chunks for display
            const displayedDocs: Document[] = rawDocs.map(doc => ({
                id: doc.id,
                text: doc.text,
                embedding: doc.embedding,
                summary: doc.text.substring(0, 50).trim() + '...',
                chunkCount: 1 // Showing chunks individually for simplicity
            }));
            
            setDocuments(displayedDocs);

        } catch (e) {
            console.error("Failed to load documents:", e);
        }
    };
    
    // Function to handle deletion
    const handleDelete = async (docId: string) => {
        Alert.alert(
            "Confirm Deletion",
            "Are you sure you want to delete this RAG chunk? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            // Deletes the chunk from the SQLite database
                            await deleteDocument(docId); 
                            Alert.alert('Deleted', 'RAG chunk removed successfully.');
                            loadDocuments(); // Reload the list
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete the chunk.');
                        }
                    } 
                },
            ]
        );
    };

    // Refresh documents every time the screen is focused
    useFocusEffect(
        useCallback(() => {
            loadDocuments();
        }, [])
    );

    // --- Upload Handler (Same as previous stable version) ---
    const handleUpload = async () => {
        setUploading(true);
        setStatus('Selecting file...');
        
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'text/plain', 'application/json'],
                copyToCacheDirectory: true, 
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                setStatus('Upload cancelled.');
                return;
            }

            const file = result.assets[0];
            const fileName = file.name;
            const fileUri = file.uri;
            
            setStatus(`Processing: ${fileName}...`);
            
            // Step 1: Extract text
            const text = await extractTextFromFile(fileUri, fileName);

            // Step 2: Split into chunks
            setStatus(`Splitting ${text.length} characters into chunks...`);
            const chunks = splitTextIntoChunks(text);
            
            if (chunks.length === 0) {
                setStatus('Error: No text chunks created.');
                Alert.alert('Error', 'Text extraction resulted in empty content.');
                return;
            }

            // Step 3: Embed and store in database
            let count = 0;
            const totalChunks = chunks.length;

            for (const chunk of chunks) {
                setStatus(`Embedding chunk ${++count}/${totalChunks} (EmbeddingGemma)...`);
                const embedding = await embedText(chunk); 
                await addDocument(chunk, embedding);
            }

            Alert.alert('✅ Success', `${fileName} (${totalChunks} chunks) processed and embedded.`);
            setStatus('Completed and Ready for Chat.');
            
            loadDocuments(); 

        } catch (err: any) {
            console.error('Upload Process Error:', err);
            Alert.alert('Processing Error', err.message || 'Failed to upload, extract, or embed the document.');
            setStatus('Error occurred.');
        } finally {
            setUploading(false);
        }
    };
    
    // --- Document List Renderer ---
    const renderDocument = ({ item, index }: { item: Document, index: number }) => (
        <View style={styles.documentItem}>
            <View style={styles.documentTextContainer}>
                <Text style={styles.documentIndex}>RAG Chunk {index + 1}:</Text>
                <Text style={styles.documentSummary} numberOfLines={2}>
                    {item.summary}
                </Text>
            </View>
            <TouchableOpacity 
                onPress={() => handleDelete(item.id)} // <-- DELETE IS USED HERE
                style={styles.actionButton}
            >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>
                Upload Financial Documents
            </Text>

            {/* Upload Section */}
            <View style={styles.uploadSection}>
                {uploading ? (
                    <View style={styles.progressContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.statusTextProgress}>{status}</Text>
                    </View>
                ) : (
                    <Button 
                        title="Select Document (PDF, TXT, JSON)" 
                        onPress={handleUpload} 
                        color="#007AFF"
                    />
                )}
            </View>

            <View style={styles.separator} />

            {/* Document List Section */}
            <Text style={styles.listHeader}>
                Processed RAG Chunks ({documents.length})
            </Text>
            
            <FlatList
                data={documents}
                renderItem={renderDocument}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No documents have been processed yet.</Text>}
            />

            {/* Floating Chat Button */}
            <TouchableOpacity
                style={styles.chatButton}
                onPress={() => router.push('./chat')}
                disabled={uploading} 
            >
                <Ionicons name="chatbubbles-outline" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 20,
        backgroundColor: '#f7f7f7',
    },
    header: { 
        fontSize: 24, 
        marginBottom: 20, 
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#1c1c1e',
    },
    uploadSection: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    progressContainer: {
        alignItems: 'center',
    },
    statusTextProgress: { 
        marginTop: 15, 
        color: '#007AFF',
        textAlign: 'center',
        fontWeight: '600',
    },
    separator: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 15,
    },
    listHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#4a4a4a',
    },
    list: {
        flex: 1,
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
    documentTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    documentIndex: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8e8e93',
    },
    documentSummary: {
        fontSize: 14,
        color: '#1c1c1e',
    },
    actionButton: {
        padding: 8,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#8e8e93',
    },
    chatButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: '#007AFF',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
    }
});