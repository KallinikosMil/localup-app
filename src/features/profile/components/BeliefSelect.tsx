import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Menu } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppIcon from '@shared/components/AppIcon';
import { Translations } from '@features/profile/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

// One optional belief, as a dropdown that DEFAULTS to "Prefer not to say".
//
// The chip grid in BeliefPicker is right for Edit profile, where someone
// has gone looking for the setting. It is wrong for onboarding, where the
// same control would read as a question you are expected to answer.
//
// A dropdown resting on "Prefer not to say" inverts that: the question is
// visible, and DOING NOTHING is already a complete, valid answer. That
// distinction matters more here than anywhere else in the app, because
// these two fields are GDPR Article 9 special category data and the
// lawful basis is explicit consent — which cannot be explicit if the
// interface implies the field must be filled.
//
// "Prefer not to say" is not a stored value. It is null, and null is what
// the ranking scores at the middle of the range. There is deliberately no
// sentinel string: the CHECK constraint on profiles would refuse one, and
// a third representation of "unanswered" is a bug waiting to happen.

type BeliefSelectProps<T extends string> = {
  label: string;
  // Sentence under the label explaining what the answer is used for.
  // Optional, because Edit profile already carries that copy above the
  // whole section.
  hint?: string;
  value: T | null;
  options: readonly T[];
  labelFor: (option: T) => string;
  onChange: (next: T | null) => void;
};

function BeliefSelect<T extends string>({
  label,
  hint,
  value,
  options,
  labelFor,
  onChange,
}: BeliefSelectProps<T>) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const unanswered = t(Translations.BELIEF_PREFER_NOT_SAY);
  const shown = value ? labelFor(value) : unanswered;

  const choose = (next: T | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View>
      <AppText
        variant="caption"
        style={[styles.label, { color: theme.colors.onSurfaceFaint }]}
      >
        {label}
      </AppText>

      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            // The box is the whole control, so it has to announce both
            // what it is and what it currently holds. Without the value
            // in the label a screen reader says only "Politics, button"
            // and the answer is invisible.
            accessibilityLabel={label + ', ' + shown}
            style={[
              styles.box,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <AppText
              variant="body"
              style={[
                Typography.message.style,
                styles.value,
                {
                  // Unanswered is deliberately quieter than an answer.
                  // It should read as a resting state, not as a
                  // placeholder that something is missing.
                  color: value
                    ? theme.colors.onSurface
                    : theme.colors.onSurfaceFaint,
                },
              ]}
            >
              {shown}
            </AppText>
            <AppIcon
              name="chevron-down"
              size={Layout.FIELD_ICON}
              color={theme.colors.onSurfaceFaint}
            />
          </Pressable>
        }
      >
        {/* First, and always present: taking the answer back has to be as
            easy as giving it, which is what makes the consent
            withdrawable. */}
        <Menu.Item onPress={() => choose(null)} title={unanswered} />
        {options.map(option => (
          <Menu.Item
            key={option}
            onPress={() => choose(option)}
            title={labelFor(option)}
          />
        ))}
      </Menu>

      {hint ? (
        <AppText
          variant="caption"
          style={[styles.hint, { color: theme.colors.onSurfaceFaint }]}
        >
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export default BeliefSelect;

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.xs + 2,
  },
  box: {
    height: Layout.FIELD_HEIGHT - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
  },
  value: {
    flex: 1,
  },
  hint: {
    marginTop: Spacing.xs + 2,
  },
});
