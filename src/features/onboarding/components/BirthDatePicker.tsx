import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Modal,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppIcon from '@shared/components/AppIcon';
import { formatDate } from '@shared/utils/date';
import {
  chooseMonth,
  chooseYear,
  dayOptions,
  decadeOf,
  decadeOptions,
  fromDate,
  isComplete,
  isDayAllowed,
  isMonthAllowed,
  isYearAllowed,
  monthOptions,
  toDate,
  yearOptions,
  YEARS_PER_DECADE,
  type BirthParts,
  type Step,
} from '@features/onboarding/utils/birthDate';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/onboarding/i18n/translationKeys';

// A bottom sheet, three taps, no wheels. Redesign §12.
//
// This replaces two earlier attempts, and the reasons both were wrong are
// worth keeping. The platform spinner wrapped around, so the months read
// "September … August" with no first or last. Three scrolling columns
// fixed the wrapping and kept the real problem: the year column is a
// hundred rows, and scrolling to a value the person already knows is the
// wrong gesture. A decade rail plus a year grid makes 1994 two taps.
//
// The 18+ ceiling is DRAWN, not omitted. A grid that just stops is
// indistinguishable from a bug — which is exactly how it was reported.

type CellState = 'idle' | 'selected' | 'closed';

const Cell = ({
  label,
  state,
  a11yLabel,
  onPress,
  width,
  height,
}: {
  label: string;
  state: CellState;
  a11yLabel: string;
  onPress: () => void;
  // Percentages, so a row of cells divides the sheet rather than
  // assuming its width. Typed loosely because RN's ViewStyle wants a
  // DimensionValue and a template string is not narrowed to one.
  width: string;
  height: number;
}) => {
  const theme = useAppTheme();
  const closed = state === 'closed';
  const selected = state === 'selected';

  return (
    <Pressable
      onPress={onPress}
      disabled={closed}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected, disabled: closed }}
      style={[
        styles.cell,
        { width: width as never, height },
        selected
          ? { backgroundColor: theme.colors.primary }
          : {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.outlineVariant,
              borderWidth: 1,
            },
        // A closed cell keeps its place and its focus stop; it just
        // recedes. Removing it would answer nothing.
        closed ? styles.cellClosed : null,
      ]}
    >
      <AppText
        variant="buttonLg"
        style={{
          color: selected
            ? theme.colors.onGradient
            : theme.colors.onSurfaceVariant,
        }}
      >
        {label}
      </AppText>
    </Pressable>
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
  initial: Date | null;
  maxDate: Date;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
}) => {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  const [parts, setParts] = useState<BirthParts>(() => fromDate(initial));
  const [step, setStep] = useState<Step>('year');
  const [decade, setDecade] = useState(() =>
    decadeOf(initial?.getFullYear() ?? maxDate.getFullYear()),
  );
  // Set when going back invalidates something, so the sheet can say why
  // rather than leaving a chip mysteriously empty.
  const [backstep, setBackstep] = useState(false);

  const titleRef = useRef<View>(null);

  useEffect(() => {
    if (!visible) return;
    const seeded = fromDate(initial);
    setParts(seeded);
    setStep(seeded.year === null ? 'year' : 'day');
    setDecade(decadeOf(initial?.getFullYear() ?? maxDate.getFullYear()));
    setBackstep(false);
    const timer = setTimeout(() => {
      const tag = findNodeHandle(titleRef.current);
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const monthName = (m: number) =>
    formatDate(new Date(2000, m, 1), i18n.language, { month: 'long' });

  const decades = useMemo(() => decadeOptions(maxDate), [maxDate]);
  const years = useMemo(() => yearOptions(decade), [decade]);
  const months = useMemo(
    () => (parts.year === null ? [] : monthOptions(parts.year, maxDate)),
    [parts.year, maxDate],
  );
  const days = useMemo(
    () =>
      parts.year === null || parts.month === null
        ? []
        : dayOptions(parts.year, parts.month),
    [parts.year, parts.month],
  );

  const pickYear = (year: number) => {
    const next = chooseYear(parts, year, maxDate);
    setParts(next.parts);
    setStep(next.step);
    setBackstep(next.cleared);
  };

  const pickMonth = (month: number) => {
    const next = chooseMonth(parts, month, maxDate);
    setParts(next.parts);
    setStep(next.step);
    setBackstep(next.cleared);
  };

  // The last of three choices closes the sheet. Nothing is left to
  // confirm, so there is no OK button competing with it.
  const pickDay = (day: number) => {
    const done = { ...parts, day };
    if (isComplete(done)) onConfirm(toDate(done));
  };

  const chip = (
    key: Step,
    filled: string | null,
    placeholder: string,
    a11y: string,
  ) => {
    const active = step === key;
    return (
      <Pressable
        key={key}
        onPress={() => {
          if (filled !== null || active) setStep(key);
        }}
        disabled={filled === null && !active}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ selected: active }}
        style={[
          styles.chip,
          active
            ? {
                backgroundColor: theme.colors.surfaceSelected,
                borderColor: theme.colors.outlineSelected,
                borderWidth: Layout.FIELD_BORDER_ERROR_LIGHT,
              }
            : filled !== null
              ? {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                }
              : {
                  // Dashed is doing real work: it is the only thing
                  // telling a first-time user this is a three-part
                  // control and not a one-shot grid.
                  borderColor: theme.colors.outlineDashed,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                },
        ]}
      >
        <AppText
          variant={active ? 'bodySmallStrong' : 'bodySmall'}
          style={{
            color: active
              ? theme.colors.primary
              : filled !== null
                ? theme.colors.onSurface
                : theme.colors.onSurfaceFaint,
          }}
        >
          {filled ?? placeholder}
        </AppText>
      </Pressable>
    );
  };

  const grid =
    step === 'year' ? (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {decades.map(d => (
            <Pressable
              key={d}
              onPress={() => setDecade(d)}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.ONBOARDING_DOB_DECADE, {
                decade: d,
              })}
              accessibilityState={{ selected: d === decade }}
              style={[
                styles.railItem,
                d === decade
                  ? { backgroundColor: theme.colors.surfaceSelected }
                  : null,
              ]}
            >
              <AppText
                variant="bodySmall"
                style={{
                  color:
                    d === decade
                      ? theme.colors.primary
                      : theme.colors.onSurfaceFaint,
                }}
              >
                {t(Translations.ONBOARDING_DOB_DECADE, { decade: d })}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.grid}>
          {years.map(y => {
            const closed = !isYearAllowed(y, maxDate);
            return (
              <Cell
                key={y}
                label={String(y)}
                width="18%"
                height={Layout.DOB_YEAR_CELL}
                state={
                  closed ? 'closed' : parts.year === y ? 'selected' : 'idle'
                }
                a11yLabel={
                  closed
                    ? t(Translations.ONBOARDING_DOB_YEAR_CLOSED, { year: y })
                    : t(Translations.ONBOARDING_DOB_YEAR_CELL, { year: y })
                }
                onPress={() => pickYear(y)}
              />
            );
          })}
        </View>
        {years.some(y => !isYearAllowed(y, maxDate)) ? (
          <AppText
            variant="caption"
            style={[styles.note, { color: theme.colors.onSurfaceFaint }]}
          >
            {t(Translations.ONBOARDING_DOB_CEILING, {
              year: maxDate.getFullYear() + 1,
            })}
          </AppText>
        ) : null}
      </>
    ) : step === 'month' ? (
      <>
        {backstep ? (
          <AppText
            variant="caption"
            style={[styles.note, { color: theme.colors.onSurfaceFaint }]}
          >
            {t(Translations.ONBOARDING_DOB_BACKSTEP, {
              year: parts.year,
              month: monthName(maxDate.getMonth()),
            })}
          </AppText>
        ) : null}
        <View style={styles.grid}>
          {months.map(m => {
            const closed = !isMonthAllowed(parts.year!, m, maxDate);
            return (
              <Cell
                key={m}
                label={monthName(m)}
                // Two columns, not three: "Σεπτεμβρίου" does not fit in a
                // third of the sheet. One grid, fed by t(), holds both
                // languages without a per-locale branch.
                width="48%"
                height={Layout.DOB_MONTH_CELL}
                state={
                  closed ? 'closed' : parts.month === m ? 'selected' : 'idle'
                }
                a11yLabel={
                  closed
                    ? t(Translations.ONBOARDING_DOB_MONTH_CLOSED, {
                        month: monthName(m),
                      })
                    : monthName(m)
                }
                onPress={() => pickMonth(m)}
              />
            );
          })}
        </View>
      </>
    ) : (
      <View style={styles.grid}>
        {days.map(d => {
          const closed = !isDayAllowed(parts.year!, parts.month!, d, maxDate);
          return (
            <Cell
              key={d}
              label={String(d)}
              width="12.5%"
              height={Layout.DOB_DAY_CELL}
              state={closed ? 'closed' : parts.day === d ? 'selected' : 'idle'}
              a11yLabel={
                closed
                  ? t(Translations.ONBOARDING_DOB_DAY_CLOSED, { day: d })
                  : String(d)
              }
              onPress={() => pickDay(d)}
            />
          );
        })}
      </View>
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        style={[styles.scrim, { backgroundColor: theme.colors.scrim }]}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={t(Translations.ONBOARDING_PICKER_CANCEL)}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surfaceSheet,
            borderColor: theme.colors.outlineSheet,
          },
        ]}
      >
        <View
          style={[
            styles.grabber,
            { backgroundColor: theme.colors.outlineDashed },
          ]}
        />

        <View style={styles.titleRow}>
          <View ref={titleRef} accessible accessibilityRole="header">
            <AppText variant="h3" style={{ color: theme.colors.onSurface }}>
              {t(Translations.ONBOARDING_DOB_LABEL)}
            </AppText>
          </View>
          {/* The only escape. No Cancel link competing with it. */}
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.ONBOARDING_PICKER_CANCEL)}
            hitSlop={Layout.HIT_SLOP}
          >
            <AppIcon
              name="close"
              size={22}
              color={theme.colors.onSurfaceFaint}
            />
          </Pressable>
        </View>

        <View style={styles.chips}>
          {chip(
            'year',
            parts.year === null ? null : String(parts.year),
            t(Translations.ONBOARDING_DOB_YEAR),
            t(Translations.ONBOARDING_DOB_CHIP_YEAR, {
              value: parts.year ?? '',
            }),
          )}
          {chip(
            'month',
            parts.month === null ? null : monthName(parts.month),
            t(Translations.ONBOARDING_DOB_MONTH),
            t(Translations.ONBOARDING_DOB_CHIP_MONTH, {
              value: parts.month === null ? '' : monthName(parts.month),
            }),
          )}
          {chip(
            'day',
            parts.day === null ? null : String(parts.day),
            t(Translations.ONBOARDING_DOB_DAY),
            t(Translations.ONBOARDING_DOB_CHIP_DAY, {
              value: parts.day ?? '',
            }),
          )}
        </View>

        {grid}
      </View>
    </Modal>
  );
};

export default BirthDatePicker;

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  // Anchored to the bottom and free to grow: each step is a different
  // height and forcing one would leave the year step carrying dead space.
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Layout.SHEET_RADIUS,
    borderTopRightRadius: Layout.SHEET_RADIUS,
    borderWidth: 1,
    paddingHorizontal: Layout.SCREEN_PADDING,
    paddingBottom: Spacing.xl + Spacing.xs,
  },
  grabber: {
    alignSelf: 'center',
    width: Layout.SHEET_GRABBER_W,
    height: Layout.SHEET_GRABBER_H,
    borderRadius: Layout.SHEET_GRABBER_H,
    marginTop: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  rail: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  railItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  // Dimmed, not gone. The cell keeps its place, its focus stop and its
  // reason.
  cellClosed: {
    opacity: 0.38,
  },
  note: {
    marginTop: Spacing.md,
  },
});
