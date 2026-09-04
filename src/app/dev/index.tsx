import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';

// Every entry points into /dev, because AppGuard exempts that group and
// redirects everything else. The two auth links used to go straight to
// /auth/login and /auth/register, so tapping them while signed in — which is
// the normal state when you are here to look at a screen — bounced you to
// Discover. They were the only dead links in the gallery.
const SCREENS = [
  {
    label: 'Login',
    route: '/dev/login',
  },
  {
    label: 'Register',
    route: '/dev/register',
  },
  {
    label: 'Forgot Password',
    route: '/dev/forgot-password',
  },
  {
    label: 'Reset Password',
    route: '/dev/reset-password',
  },
  {
    label: '1. Name & Age',
    route: '/dev/name-age',
  },
  {
    label: '2. Home City',
    route: '/dev/home-city',
  },
  {
    label: '3. Photo',
    route: '/dev/photo',
  },
  {
    label: '4. Interests & Bio',
    route: '/dev/interests',
  },
] as const;

// The two groups below are slices of that one list, so the boundary has to be
// named — it was a bare `slice(0, 2)` / `slice(2)`, which silently mislabels
// every screen added to either group.
const AUTH_SCREEN_COUNT = 4;

const DevGallery = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppText
          variant="h1"
          accessibilityRole="header"
          style={{
            color: theme.colors.primary,
          }}
        >
          Dev Gallery
        </AppText>

        <Spacer spacing={Spacing.sm} />

        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurfaceVariant,
          }}
        >
          Tap any screen to preview it
        </AppText>

        <Spacer spacing={Spacing.xxl} />

        <AppText
          variant="label"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginBottom: Spacing.sm,
          }}
        >
          Auth Screens
        </AppText>

        {SCREENS.slice(0, AUTH_SCREEN_COUNT).map(s => (
          <ScreenLink
            key={s.route}
            label={s.label}
            onPress={() => router.push(s.route as string)}
          />
        ))}

        <Spacer spacing={Spacing.xl} />

        <AppText
          variant="label"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginBottom: Spacing.sm,
          }}
        >
          Onboarding Screens
        </AppText>

        {SCREENS.slice(AUTH_SCREEN_COUNT).map(s => (
          <ScreenLink
            key={s.route}
            label={s.label}
            onPress={() => router.push(s.route as string)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const ScreenLink = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <AppText
        variant="body"
        style={{
          color: theme.colors.onSurface,
        }}
      >
        {label}
      </AppText>
      <AppText
        variant="body"
        style={{
          color: theme.colors.primary,
        }}
      >
        &rarr;
      </AppText>
    </Pressable>
  );
};

export default DevGallery;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
});
