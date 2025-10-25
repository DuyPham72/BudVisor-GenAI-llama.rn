// app/chat.tsx
import React, { useState, useRef } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InputBar from './components/InputBar';
import MessageBubble from './components/MessageBubble';
import { answerQuery } from '../services/ragService';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
}

// Simple ID generator
const generateId = () => `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const streamingRefs = useRef<Record<string, string>>({}); // accumulate streaming text per message

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const updateMessage = (id: string, text: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, text } : m))
    );
  };

  const onSend = async (text: string) => {
    const userId = generateId();
    addMessage({ id: userId, text, role: 'user' });

    const assistantId = generateId();
    streamingRefs.current[assistantId] = '';
    addMessage({ id: assistantId, text: 'Thinking...', role: 'assistant' });

    try {
      await answerQuery(
        text,
        (partial) => {
          // accumulate partial tokens
          streamingRefs.current[assistantId] += partial;
          updateMessage(assistantId, streamingRefs.current[assistantId]);
        }
      );
    } catch (err) {
      updateMessage(assistantId, 'Error generating answer');
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble role={item.role} text={item.text} />
        )}
        contentContainerStyle={{ padding: 12 }}
      />
      <InputBar onSend={onSend} />
    </SafeAreaView>
  );
}