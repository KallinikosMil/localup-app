import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';
import { BorderRadius } from '@theme/constants/BorderRadius';

// Single source of truth for the TRAVELER/LOCAL pill —
// the core brand element (UI redesign spec §3.1). Replaces
// the inline implementations in SwipeCard and friends.
type ModeBadgeProps = {
  mode: 'local' | 'traveler';
  size?: 'sm' | 'md';
};

const ModeBadge = ({
  mode,
  size = 'md',
}: ModeBadgeProps) => {
  const theme = useAppTheme();
  const isTraveler = mode === 'traveler';
  const bg = isTraveler
    ? theme.colors.modeTraveler
    : theme.colors.modeLocal;
  const sm = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        sm ? styles.pillSm : styles.pillMd,
        { backgroundColor: bg },
      ]}
    >
      <MaterialCommunityIcons
        name={
          isTraveler
            ? 'airplane'
            : 'home-variant-outline'
        }
        size={sm ? 10 : 12}
        color="#fff"
      />
      <AppText
        variant="overline"
        style={styles.text}
      >
        {isTraveler ? 'Traveler' : 'Local'}
      </AppText>
    </View>
  );
};

export default ModeBadge;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: BorderRadius.pill,
  },
  pillMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    color: '#fff',
  },
});
