import React from 'react';
import { View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { Provider as ReduxProvider } from 'react-redux';

import './i18n';
// import { store } from './store';
import { PaperLight, PaperDark } from './theme';
import {
  ThemeModeProvider,
  useThemeMode,
} from '@theme/ThemeModeProvider';

function Shell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mode } = useThemeMode(); // 'light' | 'dark' | 'system'
  const isDark = mode === 'dark';
  const paper = isDark ? PaperDark : PaperLight;

  return (
    <PaperProvider theme={paper}>
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: paper.colors.background,
          }}
        >
            {children}
        </View>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeModeProvider>
      <Shell>{children}</Shell>
    </ThemeModeProvider>
  );
}
