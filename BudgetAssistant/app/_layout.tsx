// BudgetAssistant/app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="upload" />
      <Stack.Screen name="chunkDetail" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
