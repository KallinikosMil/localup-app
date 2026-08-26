import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
        {/* NOT a SafeAreaView. This used to inset every screen in the
            app, which makes an edge-to-edge screen impossible — a child
            cannot opt out of its parent's padding, and the redesign's
            hero has to run under the status bar. The inset is per-screen
            now: see ScreenSafeArea. The background stays here so the
            areas behind the system bars are painted.

            GestureHandlerRootView lives here, once, because that is what
            react-native-gesture-handler requires of ANY GestureDetector
            in the tree. It used to be on Discover alone, so the first
            gesture added to a second screen — the photo grid on Edit —
            crashed the render. A root is a root. */}
        <GestureHandlerRootView
          style={{
            flex: 1,
            backgroundColor: paper.colors.background,
          }}
        >
          {children}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
