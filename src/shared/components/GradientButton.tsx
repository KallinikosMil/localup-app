import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Spacing } from '@theme/constants/Spacing';

type GradientButtonProps = {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  // circle mode for icon-only CTAs (e.g. like button)
  circleSize?: number;
  style?: ViewStyle;
  // Needed whenever children is an icon rather than a string — the circle
  // variant has no text for a screen reader to read.
  accessibilityLabel?: string;
};

const GradientButton = ({
  children,
  onPress,
  disabled = false,
  circleSize,
  style,
  accessibilityLabel,
}: GradientButtonProps) => {
  const theme = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isText = typeof children === 'string';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      // A string child already reads itself; only the icon variant needs
      // telling. accessibilityState carries "dimmed" through to the reader —
      // opacity alone communicates nothing to someone who cannot see it.
      accessibilityLabel={
        accessibilityLabel ?? (isText ? (children as string) : undefined)
      }
      accessibilityState={{ disabled }}
      onPressIn={() => {
        scale.value = withSpring(0.96, {
          damping: 20,
          stiffness: 300,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 20,
          stiffness: 300,
        });
      }}
      // 44px minimum hit area regardless of visual size
      hitSlop={
        circleSize && circleSize < 44 ? (44 - circleSize) / 2 : undefined
      }
    >
      <Animated.View style={[animatedStyle, disabled && styles.disabled]}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            circleSize
              ? {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                  paddingHorizontal: 0,
                  paddingVertical: 0,
                }
              : undefined,
            style,
          ]}
        >
          {isText ? (
            <AppText
              variant="h3"
              style={{
                color: theme.colors.onPrimary,
              }}
            >
              {children}
            </AppText>
          ) : (
            children
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

export default GradientButton;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  disabled: {
    opacity: 0.5,
  },
});
