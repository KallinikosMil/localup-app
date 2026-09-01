import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { Routes } from '@shared/routes';
import AppText from '@shared/components/AppText';
import AppIcon from '@shared/components/AppIcon';
import GradientButton from '@shared/components/GradientButton';
import useLocation from '@shared/hooks/useLocation';
import OnboardingShell from '@features/onboarding/components/OnboardingShell';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import {
  reverseGeocode,
  searchCities,
} from '@features/onboarding/utils/geocode';
import {
  canAdvance,
  cityReducer,
  initialCityState,
  shortcutsFor,
} from '@features/onboarding/utils/cityStep';
import type { CityOption } from '@features/onboarding/utils/cityOptions';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';

// Step 2, rebuilt location-first. Redesign §13.
//
// The order used to be backwards: this screen made someone type their
// city, and the app asked for GPS permission one screen later, after
// onboarding ended. Asking here also asks at the one moment the
// permission's purpose is self-evident.
//
// The rule that shapes everything: a detection is a QUESTION, never an
// answer. home_city decides local-or-traveller permanently, and someone
// on their third day in Athens visiting from Berlin would otherwise be
// filed as an Athens local — the exact person this app exists for,
// mislabelled for good.
//
// The type-ahead is gone for the same reason the date drill-down went:
// results churning under a focused field on every keystroke is the
// hardest widget here to make accessible. Type, press Search, results
// arrive once.

const LOCATE_TIMEOUT_MS = 20000;

const HomeCityScreen = () => {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const { update } = useOnboardingData();
  const language = i18n.language;

  const [state, dispatch] = useReducer(cityReducer, initialCityState);
  const [term, setTerm] = React.useState('');
  const [searching, setSearching] = React.useState(false);

  // lazy: the system prompt must FOLLOW the tap on "Use my location".
  // Without it the hook acquires on mount and the dialog fires the moment
  // this screen appears — unprompted, and one screen before the design
  // has explained why it is being asked.
  const location = useLocation({ lazy: true });
  const inFlight = useRef<AbortController | null>(null);
  const asked = useRef(false);

  useEffect(
    () => () => {
      inFlight.current?.abort();
    },
    [],
  );

  // The fix arrives asynchronously after the permission prompt, so the
  // reverse lookup waits for coordinates rather than for the button.
  //
  // 'search' is here as well as 'locating' because the timeout above can
  // give up before a slow fix lands — over 20s, measured. When the fix
  // then arrives the reducer records it WITHOUT changing step, so it
  // surfaces as a one-tap shortcut under the field instead of dragging
  // someone out of a search they have already started.
  useEffect(() => {
    if (state.step !== 'locating' && state.step !== 'search') return;
    if (state.detected) return;

    if (location.error) {
      // Only while we are still the ones asking. Once the screen has moved
      // on to the manual path, a late error has nothing left to report.
      if (state.step === 'locating') {
        dispatch(
          location.error.toLowerCase().includes('denied')
            ? { type: 'permissionDenied' }
            : { type: 'locateFailed' },
        );
      }
      return;
    }
    if (location.latitude === null || location.longitude === null) return;
    if (asked.current) return;
    asked.current = true;

    const controller = new AbortController();
    inFlight.current = controller;
    void (async () => {
      const city = await reverseGeocode(
        location.latitude!,
        location.longitude!,
        language,
        controller,
      );
      if (controller.signal.aborted) return;
      dispatch(city ? { type: 'located', city } : { type: 'locateFailed' });
    })();
  }, [
    state.step,
    state.detected,
    location.latitude,
    location.longitude,
    location.error,
    language,
  ]);

  // useLocation has NO timeout of its own: acquire() awaits
  // getCurrentPositionAsync, which on a device with no usable fix simply
  // never resolves. Found by running this screen on the emulator — it sat
  // on "Finding you…" indefinitely, never reporting the failure, because
  // neither coords nor an error ever arrived to end the state.
  //
  // The ceiling lives HERE and not in the hook, because the hook has six
  // other callers that mount inside the app, where waiting quietly for a
  // late fix is the right behaviour. This is the one screen where a fix
  // that never comes has to become a visible answer.
  //
  // 20s: the copy already warns that indoors takes a moment, and a cold
  // fix genuinely runs 10-30s. Short enough not to read as broken, long
  // enough not to cut off a fix that was going to arrive.
  useEffect(() => {
    if (state.step !== 'locating') return;
    const timer = setTimeout(
      () => dispatch({ type: 'locateFailed' }),
      LOCATE_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [state.step]);

  const onLocate = () => {
    asked.current = false;
    dispatch({ type: 'locate' });
    void location.refresh();
  };

  const onSearch = useCallback(async () => {
    const q = term.trim();
    if (q.length < 2) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setSearching(true);
    const found = await searchCities(q, language, controller);
    if (controller.signal.aborted) return;
    setSearching(false);
    // null is "no answer at all" — leave the screen alone rather than
    // claiming nothing matched.
    if (found) dispatch({ type: 'searched', term: q, results: found });
  }, [term, language]);

  const onNext = () => {
    if (!state.chosen) return;
    update({
      homeCity: state.chosen.name,
      homeLat: state.chosen.lat,
      homeLng: state.chosen.lng,
    });
    router.push(Routes.onboarding.photo);
  };

  const cityRow = (city: CityOption, note?: string) => {
    const selected = state.chosen?.placeId === city.placeId;
    return (
      <Pressable
        key={city.placeId}
        onPress={() => dispatch({ type: 'choose', city })}
        // ONE button carrying the whole label. Two text nodes read as two
        // unrelated fragments.
        accessibilityRole="button"
        accessibilityLabel={`${city.name}, ${note ?? city.region}`}
        accessibilityState={{ selected }}
        style={[
          styles.row,
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
        <View style={styles.rowText}>
          <AppText variant="message" style={{ color: theme.colors.onSurface }}>
            {city.name}
          </AppText>
          <AppText
            variant="caption"
            style={{ color: theme.colors.onSurfaceFaint }}
          >
            {note ?? city.region}
          </AppText>
        </View>
        {selected ? (
          <AppIcon name="check-circle" size={20} color={theme.colors.primary} />
        ) : null}
      </Pressable>
    );
  };

  const field = (
    <View style={styles.searchRow}>
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <TextInput
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          // Deliberately NOT autoFocus: stealing focus from the heading
          // robs a screen-reader user of the question they are answering.
          placeholder={t(Translations.ONBOARDING_CITY_PLACEHOLDER)}
          placeholderTextColor={theme.colors.onSurfaceFaint}
          accessibilityLabel={t(Translations.ONBOARDING_CITY_LABEL)}
          style={[
            styles.input,
            Typography.message.style,
            { color: theme.colors.onSurface },
          ]}
        />
        {term.length > 0 ? (
          <Pressable
            onPress={() => setTerm('')}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.ONBOARDING_CITY_CLEAR)}
            hitSlop={Layout.HIT_SLOP}
          >
            <AppIcon
              name="close-circle"
              size={18}
              color={theme.colors.onSurfaceFaint}
            />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={onSearch}
        disabled={term.trim().length < 2 || searching}
        accessibilityRole="button"
        accessibilityLabel={t(Translations.ONBOARDING_CITY_SEARCH)}
        accessibilityState={{ disabled: term.trim().length < 2 || searching }}
        style={[
          styles.searchBtn,
          {
            backgroundColor: theme.colors.surfaceSelected,
            borderColor: theme.colors.outlineSelected,
          },
          term.trim().length < 2 ? styles.searchOff : null,
        ]}
      >
        <AppText
          variant="bodySmallStrong"
          style={{ color: theme.colors.primary }}
        >
          {t(Translations.ONBOARDING_CITY_SEARCH)}
        </AppText>
      </Pressable>
    </View>
  );

  return (
    <OnboardingShell
      step={2}
      totalSteps={4}
      title={t(Translations.ONBOARDING_STEP_2_TITLE)}
      subtitle={t(Translations.ONBOARDING_STEP_2_SUBTITLE)}
      actionLabel={t(Translations.ONBOARDING_NEXT)}
      onAction={onNext}
      actionDisabled={!canAdvance(state)}
    >
      {/* The card earns its place as FEEDBACK — it is how "we think you
          are here" gets shown rather than asserted. Schematic placeholder,
          like every image in the set. */}
      <View
        style={[
          styles.map,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <AppIcon
          name={state.detected ? 'map-marker' : 'map-outline'}
          size={40}
          color={
            state.detected ? theme.colors.primary : theme.colors.onSurfaceFaint
          }
        />
        {state.detected ? (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: theme.colors.surfaceSelected,
                borderColor: theme.colors.outlineSelected,
              },
            ]}
          >
            <AppText
              variant="bodySmallStrong"
              style={{ color: theme.colors.primary }}
            >
              {state.detected.name}
            </AppText>
          </View>
        ) : null}
      </View>

      {state.step === 'idle' || state.step === 'locating' ? (
        <View style={styles.block}>
          <GradientButton
            size="xl"
            onPress={onLocate}
            disabled={state.step === 'locating'}
          >
            {t(
              state.step === 'locating'
                ? Translations.ONBOARDING_CITY_FINDING
                : Translations.ONBOARDING_CITY_USE_LOCATION,
            )}
          </GradientButton>

          {/* Live in EVERY state, including while locating: a cold fix
              indoors takes 10-30 seconds and nobody should be trapped
              behind it. */}
          <Pressable
            onPress={() => dispatch({ type: 'goManual' })}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.ONBOARDING_CITY_MANUAL)}
            hitSlop={Layout.HIT_SLOP_TEXT}
            style={styles.manual}
          >
            <AppText
              variant="labelStrong"
              style={{ color: theme.colors.primary }}
            >
              {t(Translations.ONBOARDING_CITY_MANUAL)}
            </AppText>
          </Pressable>

          <AppText
            variant="caption"
            style={[styles.note, { color: theme.colors.onSurfaceFaint }]}
          >
            {t(
              state.step === 'locating'
                ? Translations.ONBOARDING_CITY_LOCATING_NOTE
                : Translations.ONBOARDING_CITY_PRIVACY,
            )}
          </AppText>
        </View>
      ) : null}

      {state.step === 'detected' && state.detected ? (
        <View style={styles.block}>
          <AppText variant="h3" style={{ color: theme.colors.onSurface }}>
            {t(Translations.ONBOARDING_CITY_QUESTION, {
              city: state.detected.name,
            })}
          </AppText>
          <AppText
            variant="caption"
            style={[styles.note, { color: theme.colors.onSurfaceFaint }]}
          >
            {t(Translations.ONBOARDING_CITY_QUESTION_HINT)}
          </AppText>

          <View style={styles.answers}>
            <GradientButton
              size="xl"
              onPress={() => {
                dispatch({ type: 'confirmHome' });
              }}
            >
              {t(Translations.ONBOARDING_CITY_YES_HOME)}
            </GradientButton>

            {/* NOT an error path and not styled as one. For a travel app
                this is the more valuable of the two answers. */}
            <Pressable
              onPress={() => dispatch({ type: 'sayVisiting' })}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.ONBOARDING_CITY_NO_VISITING)}
              hitSlop={Layout.HIT_SLOP_TEXT}
              style={styles.manual}
            >
              <AppText
                variant="labelStrong"
                style={{ color: theme.colors.primary }}
              >
                {t(Translations.ONBOARDING_CITY_NO_VISITING)}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {state.step === 'search' ||
      state.step === 'results' ||
      state.step === 'noMatch' ? (
        <View style={styles.block}>
          {/* A refused permission is one line above the field, never a
              dead end and never a re-prompt. */}
          {state.deniedNote ? (
            <AppText
              variant="caption"
              style={[styles.note, { color: theme.colors.onSurfaceFaint }]}
            >
              {t(Translations.ONBOARDING_CITY_DENIED)}
            </AppText>
          ) : null}

          {field}

          {/* Fires ONCE, on submit — not on every keystroke. */}
          <View accessibilityLiveRegion="polite">
            {state.step === 'results' ? (
              <AppText
                variant="caption"
                style={[styles.note, { color: theme.colors.onSurfaceFaint }]}
              >
                {t(Translations.ONBOARDING_CITY_COUNT, {
                  count: state.results.length,
                  term: state.searchedFor,
                })}
              </AppText>
            ) : state.step === 'noMatch' ? (
              <AppText
                variant="caption"
                style={[styles.note, { color: theme.colors.error }]}
              >
                {t(Translations.ONBOARDING_CITY_NO_MATCH, {
                  term: state.searchedFor,
                })}
              </AppText>
            ) : null}
          </View>

          {state.step === 'results' ? state.results.map(c => cityRow(c)) : null}

          {state.step === 'noMatch' ? (
            <AppText
              variant="caption"
              style={[styles.note, { color: theme.colors.onSurfaceFaint }]}
            >
              {t(Translations.ONBOARDING_CITY_NO_MATCH_HELP)}
            </AppText>
          ) : null}

          {/* Zero typing is the most accessible path there is, so these
              are offered whenever a fix exists — even a stale one. */}
          {state.step === 'search' && shortcutsFor(state).length > 0 ? (
            <>
              <AppText
                variant="overline"
                style={[styles.section, { color: theme.colors.onSurfaceFaint }]}
              >
                {t(Translations.ONBOARDING_CITY_SHORTCUTS)}
              </AppText>
              {shortcutsFor(state).map(c =>
                cityRow(c, t(Translations.ONBOARDING_CITY_WHERE_YOU_ARE)),
              )}
            </>
          ) : null}

          {state.step === 'search' ? (
            <AppText
              variant="caption"
              style={[styles.note, { color: theme.colors.onSurfaceFaint }]}
            >
              {t(Translations.ONBOARDING_CITY_SEARCH_HINT)}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </OnboardingShell>
  );
};

export default HomeCityScreen;

const styles = StyleSheet.create({
  map: {
    height: Layout.CITY_MAP_HEIGHT,
    borderRadius: Layout.CARD_RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  pill: {
    paddingHorizontal: Layout.PILL_PADDING_H,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  block: {
    marginTop: Spacing.xl,
  },
  answers: {
    marginTop: Spacing.lg,
  },
  manual: {
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  note: {
    marginTop: Spacing.sm,
  },
  section: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  field: {
    flex: 1,
    minWidth: 0,
    height: Layout.FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  searchBtn: {
    height: Layout.FIELD_HEIGHT,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchOff: {
    opacity: 0.4,
  },
  row: {
    minHeight: Layout.CITY_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderRadius: Layout.CARD_RADIUS,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
});
