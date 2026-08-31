import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import CustomModal from '@shared/components/CustomModal';
import Spacer from '@shared/components/Spacer';
import { formatDate } from '@shared/utils/date';
import {
  clampParts,
  dayOptions,
  fromDate,
  monthOptions,
  toDate,
  yearOptions,
  type BirthParts,
} from '@features/onboarding/utils/birthDate';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/onboarding/i18n/translationKeys';

// Three lists, not a wheel.
//
// This replaces the platform spinner, which opened on the current month
// and wrapped around — so the months ran "September ... August" with no
// beginning and no end, and the day column rolled past 31 back to 1. A
// birth date is three ordinary facts and reads better as three ordinary
// lists: 1-31, January-December, and the years.
//
// Tap to choose rather than scroll-to-snap. A snapping wheel has to be
// released in exactly the right place and gives no target to press; a row
// is a 44pt button that either is or is not selected.

const Column = ({
  values,
  selected,
  render,
  onSelect,
  label,
}: {
  values: number[];
  selected: number;
  render: (v: number) => string;
  onSelect: (v: number) => void;
  label: string;
}) => {
  const theme = useAppTheme();
  const ref = useRef<ScrollView>(null);

  // Open on the current value rather than at the top. Without this,
  // someone born in 1994 opens the year column on 2008 and has to scroll
  // blindly to find where they are.
  useEffect(() => {
    const index = values.indexOf(selected);
    if (index < 0) return;
    const y = Math.max(0, (index - 2) * Layout.PICKER_ROW_HEIGHT);
    // A frame's grace: on first mount the ScrollView has no content yet
    // and the scroll is dropped.
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y, animated: false });
    }, 50);
    return () => clearTimeout(timer);
    // Only on open. Re-running as the selection changes would yank the
    // list out from under the finger that just tapped a row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = (by: number) => {
    const index = values.indexOf(selected);
    const next = values[index + by];
    if (next !== undefined) onSelect(next);
  };

  return (
    <View
      style={styles.column}
      // ONE node per column, not one per row. Left as a hundred separate
      // buttons, reaching 1994 in the year column meant swiping past
      // ninety-nine others — the list is a fine target for a finger and a
      // terrible one for a screen reader. As an adjustable it announces
      // "Year, 2008" and moves a year at a time, which is how the native
      // picker behaves. Marking the container `accessible` is also what
      // collapses the rows inside it.
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: render(selected) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => {
        if (e.nativeEvent.actionName === 'increment') step(1);
        else if (e.nativeEvent.actionName === 'decrement') step(-1);
      }}
    >
      <ScrollView
        ref={ref}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {values.map(v => {
          const on = v === selected;
          return (
            <Pressable
              key={v}
              onPress={() => onSelect(v)}
              accessibilityRole="button"
              // Collapsed into the column above, which is the accessible
              // node. Kept correct anyway so the row is not a trap if the
              // grouping ever comes off.
              accessibilityLabel={`${label} ${render(v)}`}
              accessibilityState={{ selected: on }}
              style={[
                styles.row,
                on
                  ? {
                      backgroundColor: theme.colors.surfaceSelected,
                      borderColor: theme.colors.outlineSelected,
                    }
                  : null,
              ]}
            >
              <AppText
                variant={on ? 'bodySmallStrong' : 'bodySmall'}
                style={{
                  color: on
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant,
                }}
              >
                {render(v)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const BirthDatePicker = ({
  visible,
  initial,
  maxDate,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  // Null when nothing has been chosen yet; the ceiling is the sensible
  // place to start, because it is the nearest legal date.
  initial: Date | null;
  maxDate: Date;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
}) => {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  const [parts, setParts] = useState<BirthParts>(() =>
    fromDate(initial ?? maxDate),
  );

  // Re-seed each time it opens, so cancelling really does discard.
  useEffect(() => {
    if (visible) setParts(fromDate(initial ?? maxDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // useAccessibilityFocus is keyed to screen focus, which never changes
  // for a modal — it opens over the same screen. Same idea, keyed to the
  // thing that does change.
  const titleRef = useRef<View>(null);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const tag = findNodeHandle(titleRef.current);
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 350);
    return () => clearTimeout(timer);
  }, [visible]);

  const years = useMemo(() => yearOptions(maxDate), [maxDate]);
  const months = useMemo(
    () => monthOptions(parts.year, maxDate),
    [parts.year, maxDate],
  );
  const days = useMemo(
    () => dayOptions(parts.year, parts.month, maxDate),
    [parts.year, parts.month, maxDate],
  );

  // Month names from the locale, never a hardcoded list — the app runs in
  // Greek too, and "January" there is "Ιανουαρίου".
  const monthName = (m: number) =>
    formatDate(new Date(2000, m, 1), i18n.language, { month: 'long' });

  const set = (next: Partial<BirthParts>) =>
    setParts(p => clampParts({ ...p, ...next }, maxDate));

  return (
    <CustomModal
      visible={visible}
      onDismiss={onCancel}
      contentStyle={styles.modal}
    >
      {/* A dialog that opens without claiming focus leaves the reader on
          the field behind it, describing a screen it can no longer
          reach. */}
      <View ref={titleRef} accessible accessibilityRole="header">
        <AppText variant="h3" style={{ color: theme.colors.onSurface }}>
          {t(Translations.ONBOARDING_DOB_LABEL)}
        </AppText>
      </View>
      <Spacer spacing={Spacing.lg} />

      <View style={styles.columns}>
        <Column
          label={t(Translations.ONBOARDING_DOB_DAY)}
          values={days}
          selected={parts.day}
          render={v => String(v)}
          onSelect={day => set({ day })}
        />
        <Column
          label={t(Translations.ONBOARDING_DOB_MONTH)}
          values={months}
          selected={parts.month}
          render={monthName}
          onSelect={month => set({ month })}
        />
        <Column
          label={t(Translations.ONBOARDING_DOB_YEAR)}
          values={years}
          selected={parts.year}
          render={v => String(v)}
          onSelect={year => set({ year })}
        />
      </View>

      <Spacer spacing={Spacing.lg} />
      <AppButton variant="primary" onPress={() => onConfirm(toDate(parts))}>
        {t(Translations.ONBOARDING_PICKER_OK)}
      </AppButton>
      <Spacer spacing={Spacing.sm} />
      <AppButton variant="link" onPress={onCancel}>
        {t(Translations.ONBOARDING_PICKER_CANCEL)}
      </AppButton>
    </CustomModal>
  );
};

export default BirthDatePicker;

const styles = StyleSheet.create({
  modal: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.lg,
  },
  columns: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.sm,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  list: {
    height: Layout.PICKER_HEIGHT,
  },
  listContent: {
    paddingVertical: Spacing.xs,
  },
  row: {
    height: Layout.PICKER_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
