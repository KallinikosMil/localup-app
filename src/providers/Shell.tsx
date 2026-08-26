import React from 'react';
import { View, StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useThemeMode } from '@theme/ThemeModeProvider';
import { PaperLight, PaperDark } from '@theme/paper';

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
        {/* A plain View, NOT a SafeAreaView. This used to inset every
            screen in the app, which makes an edge-to-edge screen
            impossible — a child cannot opt out of its parent's padding,
            and the redesign's hero has to run under the status bar. The
            inset is per-screen now: see ScreenSafeArea. The background
            stays here so the areas behind the system bars are painted. */}
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
