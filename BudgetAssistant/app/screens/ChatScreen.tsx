// app/screens/ChatScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InputBar from '../components/InputBar';
import MessageBubble from '../components/MessageBubble';
import { answerQuery } from '../../services/ragService';

type Msg = { id: string; text: string; role: 'user'|'assistant' };

export default function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: '1', text: 'Welcome — ask me anything (offline).', role: 'assistant' },
  ]);

  const onSend = async (text: string) => {
    const id = String(Date.now());
    const userMsg = { id, text, role: 'user' } as Msg;
    setMessages(prev => [...prev, userMsg]);

    // get answer from RAG service
    setMessages(prev => [...prev, { id: id + '-loading', text: 'Thinking...', role: 'assistant' }]);
    try {
      const answer = await answerQuery(text, (partial) => {
        // optional partial streaming callback - we append partial by replacing last assistant
        setMessages(prev => {
          const withoutLoading = prev.filter(m => m.id !== id + '-loading');
          return [...withoutLoading, { id: id + '-stream', text: partial, role: 'assistant' }];
        });
      });
      // replace last assistant streaming message with final
      setMessages(prev => {
        const withoutStream = prev.filter(m => m.id !== id + '-loading' && m.id !== id + '-stream');
        return [...withoutStream, { id: id + '-final', text: answer, role: 'assistant' }];
      });
    } catch (e) {
      setMessages(prev => [...prev, { id: id + '-err', text: 'Error generating answer', role: 'assistant' }]);
    }
  };

  return (
    <SafeAreaView style={{flex:1}}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({item}) => <MessageBubble role={item.role} text={item.text} />}
        contentContainerStyle={{padding:12}}
      />
      <InputBar onSend={onSend} />
    </SafeAreaView>
  );
}
