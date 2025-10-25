// src/modules/core/AppProviders.tsx
import React, { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './store';
import { setInitialized } from '../../modules/auth/slices/authSlice';
import { ThemeModeProvider, useThemeMode } from '@theme/ThemeModeProvider';
import { PaperLight, PaperDark } from './theme';
import { StatusBar } from 'react-native';
import './i18n';

function Shell({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useThemeMode();
  const paper = resolvedMode === 'dark' ? PaperDark : PaperLight;
  const barStyle = resolvedMode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <PaperProvider theme={paper}>
      <SafeAreaProvider>
        <StatusBar barStyle={barStyle} backgroundColor={paper.colors.background} />
        <SafeAreaView style={{ flex: 1, backgroundColor: paper.colors.background }}>
          {children}
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(setInitialized(true));
  }, []);

  return (
    <Provider store={store}>
      <ThemeModeProvider>
        <Shell>{children}</Shell>
      </ThemeModeProvider>
    </Provider>
  );
}
