import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';
import { BorderRadius } from '@theme/constants/BorderRadius';

// Two faces (UI redesign spec §3.2):
// - variant 'frosted' | 'tonal': display-only pill for
//   cards/profile (frosted sits on photos, tonal on
//   surfaces).
// - no variant: legacy selectable Paper Chip, still used
//   by onboarding interest picking. Migrate later.
type Props = {
  label: string;
  variant?: 'frosted' | 'tonal';
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
};

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
        style={[
          styles.pill,
          {
            backgroundColor: frosted
              ? theme.colors.WHITE_A20
              : theme.colors
                  .secondaryContainer,
          },
        ]}
      >
        <AppText
          variant="caption"
          style={{
            color: frosted
              ? theme.colors.ON_PHOTO
              : theme.colors
                  .onSecondaryContainer,
          }}
        >
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <Chip
      mode={selected ? 'flat' : 'outlined'}
      selected={selected}
      onPress={onPress}
      icon={icon}
      style={styles.legacy}
      compact
    >
      {label}
    </Chip>
  );
};

export default InterestChip;

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  legacy: {
    margin: 4,
  },
});
