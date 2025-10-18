// src/app/core/AppProviders.tsx
import React from 'react';
import { View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { Provider as ReduxProvider } from 'react-redux';

import './i18n';
import { PaperLight, PaperDark } from './theme';
import { ThemeModeProvider, useThemeMode } from '@theme/ThemeModeProvider';

function Shell({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useThemeMode(); // 'light' | 'dark'
  const paper = resolvedMode === 'dark' ? PaperDark : PaperLight;

  return (
    // <ReduxProvider store={store}>
      <PaperProvider theme={paper}>
        <SafeAreaProvider>
          {/* global background once */}
          <View style={{ flex: 1, backgroundColor: paper.colors.background }}>
            {children}
          </View>
        </SafeAreaProvider>
      </PaperProvider>
    // </ReduxProvider>
  );
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeModeProvider>
      <Shell>{children}</Shell>
    </ThemeModeProvider>
  );
}
