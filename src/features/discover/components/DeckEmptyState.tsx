import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import AppIcon, { type IconName } from '@shared/components/AppIcon';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import GradientButton from '@shared/components/GradientButton';
import Spacer from '@shared/components/Spacer';
import { type DeckEmptyState as Kind } from '@features/discover/utils/deckEmpty';
import { type MatchPreferences } from '@features/discover/utils/preferences';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/discover/i18n/translationKeys';

// The empty deck, in the four ways it can be empty.
//
// One screen rather than four, because they differ in exactly three
// places: the sentence, whether there is a number worth acting on, and
// what the button does. Four components would have drifted apart on the
// two thirds they share.

// What the reader is currently asking for. Shown on the two states where
// the filters are the story, so the numbers in the sentence have
// something to sit against.
const FilterChips = ({ prefs }: { prefs: MatchPreferences }) => {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const chip = (icon: IconName, label: string) => (
    <View
      key={label}
      style={[
        styles.chip,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <AppIcon name={icon} size={13} color={theme.colors.onSurfaceVariant} />
      <AppText
        variant="caption"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {label}
      </AppText>
    </View>
  );

  return (
    <View style={styles.chips}>
      {chip(
        'map-marker-outline',
        t(Translations.DISCOVER_CHIP_KM, { km: prefs.maxDistanceKm }),
      )}
      {chip(
        'account-outline',
        t(Translations.DISCOVER_CHIP_AGES, {
          from: prefs.minAge,
          to: prefs.maxAge,
        }),
      )}
    </View>
  );
};

const DeckEmptyState = ({
  state,
  prefs,
  widening,
  onWiden,
  onOpenFilters,
  onRefresh,
}: {
  state: Kind;
  prefs: MatchPreferences;
  widening: boolean;
  onWiden: (km: number) => void;
  onOpenFilters: () => void;
  onRefresh: () => void;
}) => {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const { icon, title, body } = ((): {
    icon: IconName;
    title: string;
    body: string;
  } => {
    switch (state.kind) {
      case 'locating':
        return {
          icon: 'crosshairs-question',
          title: t(Translations.DISCOVER_EMPTY_LOCATING_TITLE),
          body: t(Translations.DISCOVER_EMPTY_LOCATING_BODY),
        };
      case 'ageBlocks':
        return {
          icon: 'account-clock-outline',
          title: t(Translations.DISCOVER_EMPTY_AGE_TITLE),
          body: t(Translations.DISCOVER_EMPTY_AGE_BODY, {
            from: prefs.minAge,
            to: prefs.maxAge,
          }),
        };
      case 'tooTight':
        return {
          icon: 'tune-variant',
          title: t(Translations.DISCOVER_EMPTY_TIGHT_TITLE),
          body: t(Translations.DISCOVER_EMPTY_TIGHT_BODY, {
            km: prefs.maxDistanceKm,
            count: state.peopleThere,
            widen: state.widenToKm,
          }),
        };
      case 'tooFar':
        return {
          icon: 'map-marker-distance',
          title: t(Translations.DISCOVER_EMPTY_FAR_TITLE),
          body: t(Translations.DISCOVER_EMPTY_FAR_BODY, {
            count: state.peopleThere,
            km: state.theyAreAtKm,
          }),
        };
      default:
        return {
          icon: 'compass-off-outline',
          title: t(Translations.DISCOVER_EMPTY_TITLE),
          body: t(Translations.DISCOVER_EMPTY_SUBTITLE),
        };
    }
  })();

  // The filters are only worth showing where they are the explanation.
  // On "nobody is around yet" they would read as an accusation.
  const showChips = state.kind === 'tooTight' || state.kind === 'tooFar';

  return (
    <View style={styles.root}>
      <AppIcon name={icon} size={48} color={theme.colors.onSurfaceVariant} />
      <Spacer spacing={Spacing.lg} />
      <AppText
        variant="h2"
        accessibilityRole="header"
        style={[styles.centred, { color: theme.colors.onBackground }]}
      >
        {title}
      </AppText>
      <Spacer spacing={Spacing.sm} />
      <AppText
        variant="message"
        style={[styles.centred, { color: theme.colors.onSurfaceVariant }]}
      >
        {body}
      </AppText>

      {showChips ? <FilterChips prefs={prefs} /> : null}

      <Spacer spacing={Spacing.xl} />

      {state.kind === 'tooTight' ? (
        <>
          <GradientButton
            onPress={() => onWiden(state.widenToKm)}
            disabled={widening}
          >
            {widening ? (
              <ActivityIndicator size={16} color={theme.colors.onGradient} />
            ) : (
              t(Translations.DISCOVER_EMPTY_WIDEN, { km: state.widenToKm })
            )}
          </GradientButton>
          <Pressable
            onPress={onOpenFilters}
            accessibilityRole="button"
            hitSlop={Layout.HIT_SLOP_TEXT}
            style={styles.quiet}
          >
            <AppText
              variant="labelStrong"
              style={{ color: theme.colors.onSurfaceFaint }}
            >
              {t(Translations.DISCOVER_OPEN_FILTERS)}
            </AppText>
          </Pressable>
        </>
      ) : state.kind === 'ageBlocks' || state.kind === 'tooFar' ? (
        // No number to offer here, so the filters themselves are the
        // action — the reader decides what to change, we do not pick a
        // distance we would not defend.
        <AppButton variant="outlined" onPress={onOpenFilters}>
          {t(Translations.DISCOVER_OPEN_FILTERS)}
        </AppButton>
      ) : (
        <AppButton variant="outlined" onPress={onRefresh}>
          {t(Translations.DISCOVER_REFRESH)}
        </AppButton>
      )}
    </View>
  );
};

export default DeckEmptyState;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centred: {
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingVertical: Spacing.xs + 3,
    paddingHorizontal: Spacing.md + 1,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  quiet: {
    marginTop: Spacing.md + 2,
  },
});
