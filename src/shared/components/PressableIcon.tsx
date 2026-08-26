import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

type Props = {
  name?: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
  containerStyle?: React.ComponentProps<typeof Pressable>['style'];
  iconStyle?: React.ComponentProps<typeof Ionicons>['style'];
  onPress: () => void;
  // REQUIRED, not optional. An icon carries no text, so without this a
  // screen reader announces the control as just "button" and the user has
  // to guess. Making it part of the type is what stops the next icon-only
  // button from shipping silent.
  accessibilityLabel: string;
  accessibilityHint?: string;
};

const PressableIcon = (props: Props) => {
  const theme = useTheme();
  const {
    name = 'chevron-back-outline',
    size = 24,
    color = theme.colors.primary,
    containerStyle,
    iconStyle,
    onPress,
    accessibilityLabel,
    accessibilityHint,
  } = props;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      // A 24px glyph is well under the 44px anyone can reliably hit, and
      // the people who need the padding most are the least able to aim.
      hitSlop={12}
      style={
        containerStyle
          ? containerStyle
          : {
              justifyContent: 'flex-start',
            }
      }
    >
      <Ionicons
        name={name}
        size={size}
        color={color}
        style={
          iconStyle
            ? iconStyle
            : {
                alignSelf: 'flex-start',
                marginLeft: -6,
              }
        }
      />
    </Pressable>
  );
};

export default PressableIcon;
