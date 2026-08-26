import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';

// A round icon button: the back arrow over a hero photo, the close button on
// the photo viewer, the send button beside the chat input.
//
// What is shared between those is NOT the size — 36, 40 and 44 are all
// deliberate, and forcing one number would make three screens worse. What is
// shared is everything people forget:
//
//   * the circle is derived from the size, so radius can never drift from it
//   * the touch target is padded up to 44px however small the circle looks,
//     because a 36px target is below what anyone can reliably hit and the
//     people who need the slack most are the least able to aim
//   * the label is REQUIRED, because an icon says nothing out loud
//
// Colour, elevation and position stay at the call site: those genuinely
// differ, and a component with a prop for each of them would just be a View
// with extra steps.
type CircleIconButtonProps = {
  size: number;
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const MIN_TOUCH_TARGET = 44;

const CircleIconButton = ({
  size,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  style,
}: CircleIconButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled }}
    hitSlop={
      size < MIN_TOUCH_TARGET ? (MIN_TOUCH_TARGET - size) / 2 : undefined
    }
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      },
      style,
    ]}
  >
    {children}
  </Pressable>
);

export default CircleIconButton;
