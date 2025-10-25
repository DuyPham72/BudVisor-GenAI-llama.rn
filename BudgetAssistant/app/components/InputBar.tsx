// app/components/InputBar.tsx
import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';

export default function InputBar({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={{ flexDirection: 'row', padding:8, borderTopWidth:1, borderColor:'#eee', alignItems:'center' }}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ask something..."
        style={{ flex:1, borderWidth:1, borderColor:'#ddd', borderRadius:8, paddingHorizontal:8, height:40 }}
      />
      <Button title="Send" onPress={() => { if(text.trim()){ onSend(text.trim()); setText(''); }}} />
    </View>
  );
}
