import React from 'react';
import { StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useThemeMode } from '@theme/ThemeModeProvider';
import { PaperLight, PaperDark } from '@theme/paper';

// Visual shell: binds the resolved theme mode to Paper, the status bar and
// the safe-area frame every screen renders inside.
export default function Shell({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useThemeMode();
  const paper = resolvedMode === 'dark' ? PaperDark : PaperLight;
  const barStyle = resolvedMode === 'dark' ? 'light-content' : 'dark-content';

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
        >
          {children}
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
