import React from 'react';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';

// Avatar with brand-gradient ring option (new-match
// emphasis) and an initial-letter fallback — NOT the
// generic account icon (UI redesign spec §3.4).
type AvatarProps = {
  uri: string | null | undefined;
  size: number;
  ring?: boolean;
  // source for the fallback initial, e.g. display_name
  fallbackLabel?: string;
};

const RING_WIDTH = 2;
const RING_GAP = 2;

const Avatar = ({
  uri,
  size,
  ring = false,
  fallbackLabel,
}: AvatarProps) => {
  const theme = useAppTheme();
  const initial = (fallbackLabel ?? '?')
    .trim()
    .charAt(0)
    .toUpperCase();

  const insetBorder =
    theme.dark
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.1)';

  const face = uri ? (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: StyleSheet.hairlineWidth,
        // subtle inset so photos don't bleed
        // into surfaces (polish checklist)
        borderColor: insetBorder,
      }}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor:
            theme.colors.primaryContainer,
        },
      ]}
    >
      <AppText
        variant={size >= 64 ? 'h1' : 'h3'}
        style={{
          color:
            theme.colors.onPrimaryContainer,
        }}
      >
        {initial}
      </AppText>
    </View>
  );

  if (!ring) return face;

  const outer =
    size + 2 * (RING_WIDTH + RING_GAP);

  return (
    <LinearGradient
      colors={[
        theme.colors.gradientStart,
        theme.colors.gradientEnd,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size + 2 * RING_GAP,
          height: size + 2 * RING_GAP,
          borderRadius:
            (size + 2 * RING_GAP) / 2,
          backgroundColor:
            theme.colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {face}
      </View>
    </LinearGradient>
  );
};

export default Avatar;

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
