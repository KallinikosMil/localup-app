import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
type Props = {
  name?: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
  containerStyle?: React.ComponentProps<
    typeof Pressable
  >['style'];
  iconStyle?: React.ComponentProps<
    typeof Ionicons
  >['style'];
  onPress: () => void;
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
  } = props;
  return (
    <Pressable
      onPress={onPress}
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
