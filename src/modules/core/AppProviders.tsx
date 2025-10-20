import React from 'react';
import { StatusBar } from 'react-native';
import {
  Provider as PaperProvider,
  useTheme,
} from 'react-native-paper';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import './i18n';
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
  const { resolvedMode } = useThemeMode(); // 'light' | 'dark'
  const paper =
    resolvedMode === 'dark' ? PaperDark : PaperLight;
  const barStyle =
    resolvedMode === 'dark'
      ? 'light-content'
      : 'dark-content';

  return (
    <PaperProvider theme={paper}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={barStyle}
          backgroundColor={paper.colors.background}
        />
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: paper.colors.background,
          }}
          edges={['top', 'right', 'bottom', 'left']}
        >
          {children}
        </SafeAreaView>
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
