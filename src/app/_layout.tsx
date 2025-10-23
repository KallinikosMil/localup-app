import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import AppProviders from '../modules/core/AppProviders';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing } from '@theme/constants/Spacing';

export default function RootLayout() {
  return (
    <AppProviders>
      <View style={{ 
          flexGrow: 1,
          padding: Spacing.SPACING_PADDING_24,
        }}>
        <Slot />
        </View>
    </AppProviders>
  );
}
