import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from '@shared/components/AppIcon';
import { router, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AmbientGlow from '@shared/components/AmbientGlow';
import GradientButton from '@shared/components/GradientButton';
import { useAccessibilityFocus } from '@shared/hooks/useAccessibilityFocus';
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
  // Some steps carry their primary action in the body instead. See the
  // comment where the button is rendered.
  hideAction?: boolean;
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
  hideAction = false,
  showBack = true,
  backDisabled = false,
}: OnboardingShellProps) => {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();

  // backDisabled greyed ONE chevron, which left the fix not doing the
  // thing it was written for: on Android the hardware back button is the
  // primary way out of a screen, and it went straight past this. Finishing
  // can take six uploads, and complete_onboarding opens with an
  // unconditional delete of the user's media — safe as a retry, not safe
  // at all against a first run still appending.
  //
  // Returning true from the handler swallows the press. The listener only
  // exists while the guard is on, so nothing is trapped the rest of the
  // time.
  useEffect(() => {
    if (!backDisabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [backDisabled]);

  // The same door on iOS, where back is an edge swipe rather than a button.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !backDisabled });
  }, [navigation, backDisabled]);

  // The screen reader lands on the FIRST interactive thing on the step,
  // not on the title.
  //
  // Focusing the title was wrong, and wrong in a way that is easy to
  // miss: the title sits BELOW the header row, so landing there drops
  // someone into the middle of the screen with the back button already
  // behind them. On step 2 that is the only way back out.
  //
  // Which element is first depends on the step: the back button when
  // there is one, the progress bar when there is not — it is `accessible`
  // with its own label, so it is a real stop and not a gap.
  const firstFocusRef = useAccessibilityFocus<View>();
  const segments = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    // The bio field on step 4 sat under the keyboard with no way to see
    // what you were typing. `windowSoftInputMode="adjustResize"` is set in
    // the manifest and does nothing, because edgeToEdgeEnabled draws the
    // app behind the IME and the window no longer resizes — the input's
    // measured bounds are identical before and after the keyboard opens.
    // Chat hit this first and solved it the same way; the shells never
    // got the same treatment.
    //
    // Offset 0, NOT insets.top as chat uses: this shell renders inside the
    // group layout's ScreenSafeArea, so its top edge already starts below
    // the status bar and measuring from there again would double it.
    <KeyboardAvoidingView
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      // 'padding' on BOTH platforms, not 'height' on Android.
      // 'height' animates the container's own height, so closing the
      // keyboard is a full relayout of the subtree — and Android answers
      // a relayout that big by resetting accessibility focus to the top
      // of the screen. Reported as "finish typing, press Done, and the
      // cursor jumps back to the start". Padding adds space below
      // instead and leaves the tree alone.
      behavior="padding"
      keyboardVerticalOffset={0}
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
              ref={firstFocusRef}
              onPress={() => router.back()}
              disabled={backDisabled}
              accessibilityRole="button"
              accessibilityLabel={t(Common.A11Y_BACK)}
              accessibilityState={{ disabled: backDisabled }}
              hitSlop={Layout.HIT_SLOP}
              style={[styles.back, backDisabled ? styles.backOff : null]}
            >
              <AppIcon
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
            // Step 1 has no back button, so the progress bar is the first
            // stop and takes the cursor instead. The ref is harmless on
            // the other steps — only one of the two is ever attached.
            ref={showBack ? undefined : firstFocusRef}
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

        {/* The ref and the role live on the View rather than the text:
            react-native-paper's Text types its ref too narrowly to
            forward, and a View is the node findNodeHandle wants anyway. */}
        <View accessible accessibilityRole="header">
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
        </View>

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
      </ScrollView>

      {/* OUTSIDE the ScrollView, pinned to the bottom.
          It used to sit at the end of the scrolling content behind a flex
          spacer, which meant the keyboard dragged it up along with
          everything else — reported as "the keyboard takes Next with it
          and I can see a bit of it". A scrolling region and a fixed
          action are two different things and have to be two siblings; the
          field can then scroll up as far as it likes without moving the
          button. */}
      {/* Hidden, not disabled, when the step's primary action lives in the
          content instead. Step 2 has states whose real action is a button
          in the body — "Use my location", "Yes, I live here" — and a Next
          sitting under them was a SECOND thing that looked like the way
          forward. Tapping "Yes, I live here" only un-greyed Next, so it
          read as doing nothing at all; two people hit that before it was
          called a bug. One primary action per screen, and never a copy of
          it pinned to the floor. */}
      {hideAction ? null : (
        <View style={styles.action}>
          <GradientButton
            size="xl"
            onPress={onAction}
            disabled={actionDisabled}
            accessibilityLabel={actionLabel}
          >
            {actionLabel}
          </GradientButton>
        </View>
      )}
    </KeyboardAvoidingView>
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
  // The scrolling region no longer has to reach the bottom of the
  // screen, so it stops where its content stops.
  action: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
});
