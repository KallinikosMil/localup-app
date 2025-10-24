import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  View,
} from 'react-native';
import { Slot } from 'expo-router';
import AppProviders from '../modules/core/AppProviders';
import { Spacing } from '@theme/constants/Spacing';

export default function RootLayout() {
  return (
    <AppProviders>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, padding: Spacing.SPACING_PADDING_24 }}
          >
            <View style={{ flex: 1 }}>
              <Slot />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </AppProviders>
  );
}
