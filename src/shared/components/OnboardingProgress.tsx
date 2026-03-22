import React from 'react';
import {
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import AppText from './AppText';
import { Spacing } from
  '@theme/constants/Spacing';

type OnboardingProgressProps = {
  step: number;
  totalSteps: number;
  title: string;
  showBack?: boolean;
};

const OnboardingProgress = ({
  step,
  totalSteps,
  title,
  showBack = true,
}: OnboardingProgressProps) => {
  const theme = useTheme();
  const segments = Array.from(
    { length: totalSteps },
    (_, i) => i + 1,
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={
                theme.colors.onBackground
              }
            />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
        <AppText
          variant="caption"
          style={{
            color:
              theme.colors
                .onSurfaceVariant,
          }}
        >
          {step} / {totalSteps}
        </AppText>
      </View>
      <AppText
        variant="h3"
        style={{
          color:
            theme.colors.onBackground,
          marginTop:
            Spacing.SPACING_PADDING_8,
        }}
      >
        {title}
      </AppText>
      <View style={styles.segmentRow}>
        {segments.map(i => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor:
                  i <= step
                    ? theme.colors.primary
                    : theme.colors
                        .surfaceVariant,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export default OnboardingProgress;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.SPACING_PADDING_16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholder: {
    width: 24,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.SPACING_PADDING_8,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
