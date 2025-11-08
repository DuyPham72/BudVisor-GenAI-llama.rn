// BudgetAssistant/app/chat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { FlatList, TextInput as RNTextInput, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InputBar from './components/InputBar';
import MessageBubble from './components/MessageBubble';
import { answerQuery } from '../services/ragService';
import { generateId } from '../services/idGenerator';
import { clearChatMemory } from '../services/dbService';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
}

//Define the animation states
const thinkingStates = ['Thinking', 'Thinking.', 'Thinking..', 'Thinking...'];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stopped, setStopped] = useState(true);

  const messagesRef = useRef<Message[]>([]);
  const streamingRefs = useRef<Record<string, string>>({});
  const shouldStopRef = useRef(false);
  const inputRef = useRef<RNTextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Adds message while preserving the existing reference as much as possible
  const addMessage = (msg: Message) => {
    messagesRef.current = [...messagesRef.current, msg];
    setMessages([...messagesRef.current]);
  };

  // Only updates the text of one message — keeps array reference stable
  const updateMessageText = (id: string, newText: string) => {
    setMessages((prev) => {
      let updated = false;
      const next = prev.map((m) => {
        if (m.id === id && m.text !== newText) {
          updated = true;
          return { ...m, text: newText };
        }
        return m;
      });
      if (updated) messagesRef.current = next;
      return updated ? next : prev;
    });
  };

  // Initial greeting message from assistant
  useEffect(() => {
    addMessage({
      id: generateId(),
      text: "Hi, I'm your personal finance assistant. How can I help you today?",
      role: 'assistant',
    });
  }, []);

  // Animation effect for "Thinking..." message
  useEffect(() => {
    if (isGenerating) {
      // If we are generating, start an interval
      let stateIndex = 0;
      const interval = setInterval(() => {
        // Find the last message
        const lastMessage = messagesRef.current[messagesRef.current.length - 1];

        // Check if it's an assistant message and its text is one of our "thinking" states
        if (lastMessage && lastMessage.role === 'assistant' && thinkingStates.includes(lastMessage.text)) {
          // It is. Update its text to the next state in the loop.
          stateIndex = (stateIndex + 1) % thinkingStates.length;
          updateMessageText(lastMessage.id, thinkingStates[stateIndex]);
        }
      }, 500); // Loop every 500ms

      // The cleanup function will run when isGenerating becomes false
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // Stream updates every 50ms, but now we only update the message that changed
  useEffect(() => {
    const interval = setInterval(() => {
      Object.entries(streamingRefs.current).forEach(([id, text]) => {
        const existing = messagesRef.current.find((m) => m.id === id);
        if (existing && existing.text !== text) {
          // Skip this update, let the animation run
          if (text === '' && thinkingStates.includes(existing.text)) {
            return; 
          }
          else {
            updateMessageText(id, text);
          }
        }
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Smooth auto-scroll when new message arrives or updates
  useEffect(() => {
    if (messages.length > 0) {
      const timeout = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [messages]);

  // Clear chat memory on unmount
  useEffect(() => {
    return () => {
      console.log('Leaving chat screen, clearing chat memory...');
      clearChatMemory();
    };
  }, []);

  const stopGenerating = () => {
    if (shouldStopRef.current) return; // already stopping
    shouldStopRef.current = true;

    // Append [Stopped] immediately to the assistant message being streamed
    const lastAssistantId = Object.keys(streamingRefs.current).pop();
    if (lastAssistantId) {
      streamingRefs.current[lastAssistantId] += ' [Stopped]';
      updateMessageText(lastAssistantId, streamingRefs.current[lastAssistantId]);
    }

    setIsGenerating(false);
    setStopped(true); // re-enable Send button immediately
  };

  const onSend = async (text: string) => {
    if (isGenerating) return;

    setStopped(false); // block Send button during generation

    const userId = generateId();
    addMessage({ id: userId, text, role: 'user' });

    const assistantId = generateId();
    streamingRefs.current[assistantId] = '';
    addMessage({ id: assistantId, text: 'Thinking', role: 'assistant' });

    shouldStopRef.current = false;
    setIsGenerating(true);

    try {
      await answerQuery(text, (partial) => {
        if (shouldStopRef.current) return;
        streamingRefs.current[assistantId] += partial;

        // check if "[Stopped]" appears and update stopped flag
        if (streamingRefs.current[assistantId].includes(' [Stopped]')) {
          setStopped(true); // re-enable Send button immediately
        }
      });

      if (!shouldStopRef.current) {
        streamingRefs.current[assistantId] += ''; // final flush
        setStopped(true); // ensure Send is enabled if finished normally
      }
    } catch (err) {
      console.error(err);
      streamingRefs.current[assistantId] = 'Error generating answer';
    } finally {
      setIsGenerating(false);
      setStopped(true); // allow sending again after generation
      inputRef.current?.focus();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble role={item.role} text={item.text} />
            )}
            contentContainerStyle={{
              flexGrow: 1,
              padding: 12,
              paddingBottom: 80,
            }}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            windowSize={5}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={100}
          />

          <InputBar
            ref={inputRef}
            onSend={onSend}
            onStop={stopGenerating}
            isGenerating={isGenerating}
            stopped={stopped}  // <-- new prop
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
