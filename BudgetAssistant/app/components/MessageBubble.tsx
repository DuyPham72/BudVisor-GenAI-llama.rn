// app/components/MessageBubble.tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function MessageBubble({ role, text }: { role: 'user'|'assistant', text: string }) {
  const align = role === 'user' ? 'flex-end' : 'flex-start';
  const bg = role === 'user' ? '#DCF8C6' : '#FFFFFF';
  return (
    <View style={{ alignSelf: align, marginVertical:4, maxWidth:'85%' }}>
      <View style={{ backgroundColor: bg, padding:10, borderRadius:8 }}>
        <Text>{text}</Text>
      </View>
    </View>
  );
}
