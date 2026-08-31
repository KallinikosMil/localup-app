import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import AppIcon, { type IconName } from '@shared/components/AppIcon';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';

type Props = {
  label: string;
  // 'frosted' sits on a photo; without a variant the chip is a selectable
  // control on an ordinary surface.
  variant?: 'frosted' | 'tonal';
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
};

// A chosen chip is a FILLED control: solid brand violet, white label, in
// both themes. It used to borrow the surfaceSelected/outlineSelected tint,
// which reads as "picked out" on an unread match row but is too quiet for a
// grid of thirty-two where the whole task is seeing what you have chosen.
// The redesign draws it filled on every board that has one, so the token is
// its own rather than a second meaning stacked onto the tint.
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
      // Drawn at 39pt by the artboards. hitSlop rather than a taller box:
      // these wrap into rows, and growing them would re-flow the grid.
      hitSlop={Layout.HIT_SLOP}
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.chipSelected
            : theme.colors.surfaceElevated,
          // The fill IS the border when chosen — a contrasting outline round
          // a solid pill only makes it look like two shapes.
          borderColor: selected
            ? theme.colors.chipSelected
            : theme.colors.outlineVariant,
        },
      ]}
    >
      {icon ? (
        <AppIcon
          name={icon as IconName}
          size={16}
          color={
            selected ? theme.colors.onChipSelected : theme.colors.onSurfaceFaint
          }
        />
      ) : null}
      <AppText
        variant={selected ? 'bodySmallStrong' : 'bodySmall'}
        style={{
          color: selected
            ? theme.colors.onChipSelected
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
