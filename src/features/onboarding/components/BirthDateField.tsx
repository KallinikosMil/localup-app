import React, { useRef, useState } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppIcon from '@shared/components/AppIcon';
import { formatDate } from '@shared/utils/date';
import {
  MAX_LEN,
  evaluateDob,
  nextBoxAfterTyping,
  previousBoxOnBackspace,
  type DobBox,
  type DobInput,
  type DobResult,
} from '@features/onboarding/utils/birthDate';
import { useAppTheme } from '@theme/paper';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/onboarding/i18n/translationKeys';

// Three boxes, typed, in the order they are spoken. Redesign §12.
//
// This replaces a modal, and onboarding now has none at all. The reason
// is not taste: a text input is a role every assistive technology already
// drives — braille, switch control, voice control, external keyboard —
// with nothing to teach. The bespoke grid that came before it had to
// invent all of that and got it wrong.
//
// Because typing cannot make an illegal date unreachable, the 18+ rule is
// checked the moment the year is complete and answered under the field,
// naming the day the person becomes eligible rather than just refusing.

const BOXES: { key: DobBox; flex: number }[] = [
  { key: 'day', flex: 1 },
  { key: 'month', flex: 1 },
  { key: 'year', flex: 1.6 },
];

const BirthDateField = ({
  value,
  onChange,
  today,
}: {
  value: DobInput;
  onChange: (next: DobInput, result: DobResult) => void;
  // Injected rather than read here, so the screen and the tests agree on
  // what "now" is.
  today: Date;
}) => {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const [focused, setFocused] = useState<DobBox | null>(null);

  const refs = {
    day: useRef<TextInput>(null),
    month: useRef<TextInput>(null),
    year: useRef<TextInput>(null),
  };

  const result = evaluateDob(value, today);

  const set = (box: DobBox, raw: string) => {
    // Strip anything that is not a digit rather than rejecting the whole
    // edit: some keyboards insert a separator when the box fills.
    const clean = raw.replace(/\D/g, '').slice(0, MAX_LEN[box]);
    const next = { ...value, [box]: clean };
    onChange(next, evaluateDob(next, today));

    const forward = nextBoxAfterTyping(box, clean);
    if (forward) refs[forward].current?.focus();
  };

  const onKeyPress = (box: DobBox, key: string) => {
    if (key !== 'Backspace') return;
    const back = previousBoxOnBackspace(box, value[box]);
    if (back) refs[back].current?.focus();
  };

  const helper = (() => {
    switch (result.kind) {
      case 'ok':
        return {
          tone: 'ok' as const,
          text: t(Translations.ONBOARDING_DOB_ECHO, { age: result.age }),
        };
      case 'tooYoung':
        return {
          tone: 'error' as const,
          text: t(Translations.ONBOARDING_DOB_UNDER_AGE, {
            when: formatDate(result.eligibleOn, i18n.language, {
              month: 'long',
              year: 'numeric',
            }),
          }),
        };
      case 'invalid':
        return {
          tone: 'error' as const,
          text: t(Translations.ONBOARDING_DOB_INVALID),
        };
      default:
        return {
          tone: 'idle' as const,
          text: t(Translations.ONBOARDING_DOB_HELPER),
        };
    }
  })();

  const helperColor =
    helper.tone === 'error'
      ? theme.colors.error
      : helper.tone === 'ok'
        ? theme.colors.success
        : theme.colors.onSurfaceFaint;

  return (
    <View>
      <AppText
        variant="caption"
        style={[styles.label, { color: theme.colors.onSurfaceFaint }]}
      >
        {t(Translations.ONBOARDING_DOB_LABEL)}
      </AppText>

      {/* One label for the group, because three numbers on their own say
          nothing about what order they are in. */}
      <View
        style={styles.row}
        accessibilityLabel={t(Translations.ONBOARDING_DOB_GROUP)}
      >
        {BOXES.map(({ key, flex }) => (
          <TextInput
            key={key}
            ref={refs[key]}
            value={value[key]}
            onChangeText={raw => set(key, raw)}
            onKeyPress={e => onKeyPress(key, e.nativeEvent.key)}
            onFocus={() => setFocused(key)}
            onBlur={() => setFocused(null)}
            keyboardType="number-pad"
            maxLength={MAX_LEN[key]}
            placeholder={t(
              key === 'day'
                ? Translations.ONBOARDING_DOB_DD
                : key === 'month'
                  ? Translations.ONBOARDING_DOB_MM
                  : Translations.ONBOARDING_DOB_YYYY,
            )}
            placeholderTextColor={theme.colors.onSurfaceFaint}
            accessibilityLabel={t(
              key === 'day'
                ? Translations.ONBOARDING_DOB_DAY
                : key === 'month'
                  ? Translations.ONBOARDING_DOB_MONTH
                  : Translations.ONBOARDING_DOB_YEAR,
            )}
            style={[
              styles.box,
              Typography.chatTitle.style,
              {
                flex,
                color: theme.colors.onSurface,
                backgroundColor: theme.colors.surfaceElevated,
                borderColor:
                  focused === key
                    ? theme.colors.outlineSelected
                    : helper.tone === 'error'
                      ? theme.colors.errorFieldOutline
                      : theme.colors.outlineVariant,
                borderWidth:
                  focused === key || helper.tone === 'error'
                    ? Layout.FIELD_BORDER_ERROR_LIGHT
                    : Layout.FIELD_BORDER,
              },
            ]}
          />
        ))}
      </View>

      {/* Spoken when it changes, not only when focus reaches it: after
          typing into three separate boxes, hearing back what the app
          understood is the whole point. */}
      <View style={styles.helper} accessibilityLiveRegion="polite">
        {helper.tone === 'ok' ? (
          <AppIcon
            name="check-circle-outline"
            size={Layout.FIELD_ERROR_ICON}
            color={theme.colors.success}
          />
        ) : helper.tone === 'error' ? (
          <AppIcon
            name="alert-circle-outline"
            size={Layout.FIELD_ERROR_ICON}
            color={theme.colors.error}
          />
        ) : null}
        <AppText
          variant="caption"
          style={[styles.helperText, { color: helperColor }]}
        >
          {helper.text}
        </AppText>
      </View>
    </View>
  );
};

export default BirthDateField;

const styles = StyleSheet.create({
  label: {
    marginBottom: Layout.FIELD_LABEL_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: Layout.DOB_BOX_GAP,
  },
  box: {
    height: Layout.FIELD_HEIGHT,
    borderRadius: Layout.FIELD_RADIUS,
    textAlign: 'center',
  },
  helper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.FIELD_ERROR_GAP,
    marginTop: Layout.FIELD_LABEL_GAP,
  },
  helperText: {
    flex: 1,
  },
});
