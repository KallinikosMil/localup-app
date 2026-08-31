import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTranslation } from 'react-i18next';

import AppText from './AppText';
import { Spacing } from '@theme/constants/Spacing';
import { Translations as Common } from '@shared/i18n/translationKeys';

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
  const { t } = useTranslation();
  const segments = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t(Common.A11Y_BACK)}
            hitSlop={12}
          >
            <MaterialCommunityIcons
              importantForAccessibility="no"
              accessibilityElementsHidden
              name="arrow-left"
              size={24}
              color={theme.colors.onBackground}
            />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
        <AppText
          variant="caption"
          style={{
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {step} / {totalSteps}
        </AppText>
      </View>
      {/* Above the title, not below it. Every screen follows the header with
          its own subtitle, so a bar sitting between the two cut the heading
          block in half and read as a divider rather than as progress. */}
      <View
        // Four coloured slivers convey progress visually and nothing
        // otherwise. One grouped label says where you are.
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t(Common.A11Y_ONBOARDING_PROGRESS, {
          step,
          total: totalSteps,
        })}
        accessibilityValue={{ min: 0, max: totalSteps, now: step }}
        style={styles.segmentRow}
      >
        {segments.map(i => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor:
                  i <= step
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
              },
            ]}
          />
        ))}
      </View>
      <AppText
        variant="h3"
        style={{
          color: theme.colors.onBackground,
        }}
      >
        {title}
      </AppText>
    </View>
  );
};

export default OnboardingProgress;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
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
    gap: Spacing.sm,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
