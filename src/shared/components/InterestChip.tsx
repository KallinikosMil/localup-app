import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  label: string;
  // 'frosted' sits on a photo; without a variant the chip is a selectable
  // control on an ordinary surface.
  variant?: 'frosted' | 'tonal';
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
};

// Selected reuses the surfaceSelected/outlineSelected pair rather than
// inventing a fourth "chosen" look. That pair already means "this one is
// picked out" on unread match rows and on shared interests, and one
// meaning per colour is the only way a reader learns it.
const InterestChip = ({
  label,
  variant,
  icon,
  selected = false,
  onPress,
}: Props) => {
  const theme = useAppTheme();

  if (variant) {
    const frosted = variant === 'frosted';
    return (
      <View
        // The frosted/tonal pill is a label, not a control: group it so it
        // is read as one phrase instead of stray characters.
        accessible
        accessibilityLabel={label}
        style={[
          styles.pill,
          {
            backgroundColor: frosted
              ? theme.colors.chipOnPhoto
              : theme.colors.secondaryContainer,
            borderColor: frosted
              ? theme.colors.chipOnPhotoBorder
              : theme.colors.secondaryContainer,
          },
        ]}
      >
        <AppText
          variant="micro"
          style={{
            color: frosted
              ? theme.colors.ON_PHOTO
              : theme.colors.onSecondaryContainer,
          }}
        >
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      // Whether a chip is chosen is shown by fill colour alone. Without
      // this, a reader hears every chip identically and cannot tell what
      // they have already picked.
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.surfaceSelected
            : theme.colors.surfaceElevated,
          borderColor: selected
            ? theme.colors.outlineSelected
            : theme.colors.outlineVariant,
        },
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon as IconName}
          size={16}
          color={selected ? theme.colors.primary : theme.colors.onSurfaceFaint}
        />
      ) : null}
      <AppText
        variant={selected ? 'bodySmallStrong' : 'bodySmall'}
        style={{
          color: selected
            ? theme.colors.primary
            : theme.colors.onSurfaceVariant,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
};

export default InterestChip;

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: Layout.CHIP_PADDING_H,
    paddingVertical: Layout.CHIP_PADDING_V,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.PROGRESS_BAR_GAP + 1,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: Layout.CHIP_PADDING_H + 3,
    paddingVertical: Layout.CHIP_PADDING_V + 3,
  },
});
