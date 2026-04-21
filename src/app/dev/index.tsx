import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import AppText from
  '@shared/components/AppText';
import Spacer from
  '@shared/components/Spacer';
import { Spacing } from
  '@theme/constants/Spacing';
import { BorderRadius } from
  '@theme/constants/BorderRadius';

const SCREENS = [
  {
    label: 'Login',
    route: '/auth/login',
  },
  {
    label: 'Register',
    route: '/auth/register',
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

const DevGallery = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor:
            theme.colors.background,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <AppText
          variant="h1"
          style={{
            color: theme.colors.primary,
          }}
        >
          Dev Gallery
        </AppText>

        <Spacer
          spacing={Spacing.SPACING_PADDING_8}
        />

        <AppText
          variant="body"
          style={{
            color:
              theme.colors
                .onSurfaceVariant,
          }}
        >
          Tap any screen to preview it
        </AppText>

        <Spacer
          spacing={
            Spacing.SPACING_PADDING_32
          }
        />

        <AppText
          variant="label"
          style={{
            color:
              theme.colors
                .onSurfaceVariant,
            marginBottom:
              Spacing.SPACING_PADDING_8,
          }}
        >
          Auth Screens
        </AppText>

        {SCREENS.slice(0, 2).map(s => (
          <ScreenLink
            key={s.route}
            label={s.label}
            onPress={() =>
              router.push(
                s.route as string,
              )
            }
          />
        ))}

        <Spacer
          spacing={
            Spacing.SPACING_PADDING_24
          }
        />

        <AppText
          variant="label"
          style={{
            color:
              theme.colors
                .onSurfaceVariant,
            marginBottom:
              Spacing.SPACING_PADDING_8,
          }}
        >
          Onboarding Screens
        </AppText>

        {SCREENS.slice(2).map(s => (
          <ScreenLink
            key={s.route}
            label={s.label}
            onPress={() =>
              router.push(
                s.route as string,
              )
            }
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
      style={[
        styles.card,
        {
          backgroundColor:
            theme.colors.surface,
          borderColor:
            theme.colors.outlineVariant,
        },
      ]}
    >
      <AppText
        variant="body"
        style={{
          color:
            theme.colors.onSurface,
        }}
      >
        {label}
      </AppText>
      <AppText
        variant="body"
        style={{
          color:
            theme.colors.primary,
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
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
    paddingTop:
      Spacing.SPACING_PADDING_60,
    paddingBottom:
      Spacing.SPACING_PADDING_32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical:
      Spacing.SPACING_PADDING_16,
    paddingHorizontal:
      Spacing.SPACING_PADDING_16,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom:
      Spacing.SPACING_PADDING_8,
  },
});
