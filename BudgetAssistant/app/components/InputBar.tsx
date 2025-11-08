// BudgetAssistant/app/components/InputBar.tsx
import React, { useState, forwardRef, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, TextInput as RNTextInput } from 'react-native';

interface InputBarProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  stopped: boolean;
}

const InputBar = forwardRef<RNTextInput, InputBarProps>(
  ({ onSend, onStop, isGenerating, stopped }, ref) => {
    const [text, setText] = useState('');

    const handleSend = () => {
      if (!text.trim() || isGenerating || !stopped) return; // disabled until allowed
      const msg = text.trim();
      setText('');
      onSend(msg);
    };

    const handleStop = () => {
      if (!isGenerating) return; // only stop when generating
      onStop();
    };

    useEffect(() => {
      if (!isGenerating) {
        setTimeout(() => {
          (ref as React.RefObject<RNTextInput>)?.current?.focus();
        }, 50);
      }
    }, [isGenerating]);

    return (
      <View style={styles.container}>
        <TextInput
          ref={ref as React.RefObject<RNTextInput>}
          value={text}
          onChangeText={setText}
          placeholder="Ask something..."
          style={styles.input}
          multiline={false}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
        />

        {isGenerating ? (
          <Button
            title="Stop"
            color="red"
            onPress={handleStop} // always clickable while generating
          />
        ) : (
          <Button
            title="Send"
            color={stopped ? '#2196F3' : '#888'}
            onPress={handleSend}
            disabled={!stopped}
          />
        )}
      </View>
    );
  }
);

export default InputBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'center',
    height: 56,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 40,
    fontSize: 16,
    backgroundColor: '#fff',
  },
});
