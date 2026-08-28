import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AmbientGlow from '@shared/components/AmbientGlow';
import GradientButton from '@shared/components/GradientButton';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';
import { Translations as Common } from '@shared/i18n/translationKeys';

// The frame all four onboarding steps share: an ambient blob, a one-line
// progress header, a title and subtitle, the step's own content, and the
// Next button pinned to the bottom.
//
// The progress bar moved ONTO the header row. It used to sit on its own
// line between the header and the title, which cut the heading block in
// half and read as a divider rather than as progress. Beside the back
// arrow and a "1 of 4" counter it reads as what it is.

type OnboardingShellProps = {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  // The label on the bottom action. Every step has exactly one.
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  showBack?: boolean;
  // Step 4 only. Finishing can mean six uploads and two RPC round trips,
  // and complete_onboarding OPENS with an unconditional
  // "delete from media where user_id = …". That is safe as a retry
  // primitive and not safe at all against a first run still appending —
  // so while the mutation is in flight there must be no way back to a
  // screen that can start a second one.
  backDisabled?: boolean;
};

const OnboardingShell = ({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  actionLabel,
  onAction,
  actionDisabled = false,
  showBack = true,
  backDisabled = false,
}: OnboardingShellProps) => {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const segments = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <AmbientGlow size={Layout.GLOW_SIZE_LG} x={-60} y={-140} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.sm,
            paddingBottom: Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              disabled={backDisabled}
              accessibilityRole="button"
              accessibilityLabel={t(Common.A11Y_BACK)}
              accessibilityState={{ disabled: backDisabled }}
              hitSlop={Layout.HIT_SLOP}
              style={[styles.back, backDisabled ? styles.backOff : null]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={theme.colors.onSurfaceFaint}
              />
            </Pressable>
          ) : (
            // Keeps the bar in the same place on step 1, where there is
            // nothing to go back to.
            <View style={styles.back} />
          )}

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
            {segments.map(i =>
              i <= step ? (
                <LinearGradient
                  key={i}
                  colors={[
                    theme.colors.gradientStart,
                    theme.colors.gradientEnd,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.segment}
                />
              ) : (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: theme.colors.outlineVariant,
                    },
                  ]}
                />
              ),
            )}
          </View>

          <AppText
            variant="microStrong"
            style={{
              color: theme.colors.onSurfaceFaint,
            }}
          >
            {t(Common.COMMON_STEP_COUNT, {
              step,
              total: totalSteps,
            })}
          </AppText>
        </View>

        <AppText
          variant="display"
          style={[
            styles.title,
            {
              color: theme.colors.onBackground,
            },
          ]}
        >
          {title}
        </AppText>

        {subtitle ? (
          <AppText
            variant="message"
            style={[
              styles.subtitle,
              {
                color: theme.colors.onSurfaceFaint,
              },
            ]}
          >
            {subtitle}
          </AppText>
        ) : null}

        <View style={styles.body}>{children}</View>

        <View style={styles.spacer} />

        <GradientButton
          size="xl"
          onPress={onAction}
          disabled={actionDisabled}
          accessibilityLabel={actionLabel}
        >
          {actionLabel}
        </GradientButton>
      </ScrollView>
    </View>
  );
};

export default OnboardingShell;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    height: Layout.BUTTON_LG,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.STRIP_GAP,
  },
  backOff: {
    opacity: 0.4,
  },
  back: {
    width: Layout.ICON_BUTTON + 4,
    height: Layout.ICON_BUTTON + 4,
    marginLeft: -Spacing.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: Layout.CHIP_PADDING_V,
  },
  segment: {
    flex: 1,
    height: Spacing.xs,
    borderRadius: Layout.PROGRESS_BAR_RADIUS,
  },
  title: {
    marginTop: Spacing.xxl + 4,
  },
  subtitle: {
    marginTop: Spacing.sm,
  },
  body: {
    marginTop: Spacing.xxl + 4,
    gap: Layout.SCREEN_PADDING,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
});
