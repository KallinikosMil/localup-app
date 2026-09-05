import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import InterestChip from '@shared/components/InterestChip';
import { toggleBelief } from '@features/profile/utils/beliefs';
import { Translations } from '@features/profile/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

// One optional, single-select answer, drawn as a chip grid.
//
// ⚠️ Used for GDPR Article 9 SPECIAL CATEGORY data — politics and
// religion. Three things about this component exist because of that and
// must not be simplified away:
//
//   - There is NO "prefer not to say" chip. Choosing nothing IS the
//     answer, and adding a chip for it would turn silence into a
//     declaration the person has to make.
//   - The chosen chip clears when tapped again, and the hint says so.
//     Withdrawing consent has to be as easy as giving it.
//   - Nothing here is ever required. The caller must not gate a save on
//     it.
//
// A segmented control was the obvious reuse and does not fit: politics
// has six options and religion nine, and neither survives being squeezed
// into one horizontal row on a phone.
type Props<T extends string> = {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
  labelFor: (option: T) => string;
};

function BeliefPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  labelFor,
}: Props<T>) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.block}>
      <AppText
        variant="overline"
        style={[styles.label, { color: theme.colors.onSurfaceFaint }]}
      >
        {label}
      </AppText>

      <View style={styles.grid}>
        {options.map(option => (
          <InterestChip
            key={option}
            label={labelFor(option)}
            selected={value === option}
            onPress={() => onChange(toggleBelief(value, option))}
          />
        ))}
      </View>

      {/* Only once something is chosen — before that there is nothing to
          clear, and the sentence would be describing a control that is
          not there yet. */}
      {value ? (
        <AppText
          variant="caption"
          style={[styles.hint, { color: theme.colors.onSurfaceFaint }]}
        >
          {t(Translations.PROFILE_BELIEF_CLEAR_HINT)}
        </AppText>
      ) : null}
    </View>
  );
}

export default BeliefPicker;

const styles = StyleSheet.create({
  block: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.CHIP_GAP,
  },
  hint: {
    marginTop: Spacing.sm,
  },
});
