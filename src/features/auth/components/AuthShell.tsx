import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from '@shared/components/AppIcon';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import { useAccessibilityFocus } from '@shared/hooks/useAccessibilityFocus';
import AmbientGlow from '@shared/components/AmbientGlow';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/auth/i18n/translationKeys';

// The frame all four auth screens share: two ambient blobs, the app mark,
// a title and a subtitle. They were four near-identical copies of this,
// which is how the four of them drifted apart in the first place.
//
// The mark is the LocalUp pin, outlined — the LABEL form (see YesMark).
// It sits inside a gradient tile rather than a button, so it never reads
// as something to press.

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  // Pinned to the bottom of the screen rather than the end of the form:
  // "Don't have an account?" belongs to the page, not to the last field.
  footer?: React.ReactNode;
};

const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  const theme = useAppTheme();
  const firstFocusRef = useAccessibilityFocus<View>();
  const { t } = useTranslation();

  return (
    // The root does not shrink; the scroll area below handles the
    // keyboard. Both ambient blobs are positioned against this container,
    // so padding it when the IME opened used to slide them up the screen
    // with everything else.
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <AmbientGlow size={Layout.GLOW_SIZE_LG} x={-60} y={-140} />
      {/* The second blob is paler and comes from the opposite corner, so
          a form with nothing typed in it still has somewhere to look. */}
      <AmbientGlow size={Layout.GLOW_SIZE_SM} x={220} y={520} />

      {/* Reads the real IME insets and brings the focused field up
          itself. The manifest asks for adjustResize and gets nothing,
          because edgeToEdgeEnabled draws the app behind the keyboard and
          the window never resizes — so Android's own
          scroll-to-focused-input never fired either. Four screens here
          are forms; the password fields are the lowest on the page and
          were the worst hit. */}
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.xl,
            paddingBottom: Spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={Spacing.xxl}
      >
        {/* The cursor lands HERE, at the literal top of the content, not
            on the title below it. Same rule as the onboarding shell:
            never drop someone into the middle of a screen with things
            already behind them. `accessible` collapses the mark and the
            wordmark into the one stop they read as. */}
        <View
          ref={firstFocusRef}
          accessible
          accessibilityLabel={t(Translations.AUTH_HEADER_TEXT)}
          style={styles.brandRow}
        >
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mark}
          >
            <AppIcon
              name="map-marker-outline"
              size={27}
              color={theme.colors.onGradient}
            />
          </LinearGradient>
          <AppText
            variant="wordmarkLg"
            style={{
              color: theme.colors.onBackground,
            }}
          >
            {t(Translations.AUTH_HEADER_TEXT)}
          </AppText>
        </View>

        {/* Same reason as the onboarding shell: arriving on a screen must
            say which screen it is, not read out whatever sits where the
            cursor happened to be. */}
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

        <View style={styles.form}>{children}</View>

        {footer ? (
          <>
            <View style={styles.spacer} />
            <View style={styles.footer}>{footer}</View>
          </>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
};

export default AuthShell;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  mark: {
    width: Layout.LOGO_MARK,
    height: Layout.LOGO_MARK,
    borderRadius: Layout.LOGO_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.xxl + 4,
  },
  subtitle: {
    marginTop: Spacing.xs + 2,
  },
  form: {
    marginTop: Spacing.xxl,
    gap: Spacing.lg,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
  },
});
