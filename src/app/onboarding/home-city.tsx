import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, FlatList, Pressable } from 'react-native';
import { Routes } from '@shared/routes';
import AppIcon from '@shared/components/AppIcon';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import OnboardingShell from '@features/onboarding/components/OnboardingShell';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import {
  toCityOptions,
  type CityOption,
  type NominatimPlace,
} from '@features/onboarding/utils/cityOptions';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

const DEBOUNCE_MS = 300;
// Shorter than the app's 15s Supabase budget: this is a type-ahead, and a
// suggestion that arrives after several seconds is useless anyway.
const SEARCH_TIMEOUT_MS = 8000;

const HomeCityScreen = () => {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const { data, update } = useOnboardingData();
  const language = i18n.language;

  const [query, setQuery] = useState(data.homeCity);
  const [results, setResults] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState(data.homeCity);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);

  // Leaving the screen mid-search must not leave a pending debounce timer
  // or an open request behind to call setState on an unmounted component.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      inFlightRef.current?.abort();
    },
    [],
  );

  // Nominatim is the one network call the app makes that is NOT a Supabase
  // call, so the global 15s fetch timeout in config/supabase.ts does not
  // cover it: a hung connection here hangs forever. It also had no request
  // sequencing, so a slow earlier response could land after a newer one and
  // repopulate a list the user had already moved past (or cleared).
  //
  // Aborting the previous request on every new search fixes both: the stale
  // response is cancelled rather than raced, and the timeout gives the
  // request an upper bound.
  const searchCities = useCallback(
    async (text: string) => {
      inFlightRef.current?.abort();

      if (text.length < 2) {
        setResults([]);
        return;
      }

      const controller = new AbortController();
      inFlightRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

      try {
        // featureType, NOT featuretype. Nominatim ignores the lowercase
        // spelling silently, so this filter was never applied and a search
        // for "Λαρισα" offered a mountain peak near Argos as its second
        // result. accept-language keeps the labels in one language rather
        // than whatever each OSM object happens to carry.
        const url =
          'https://nominatim.openstreetmap.org/search' +
          `?q=${encodeURIComponent(text)}` +
          '&format=json&limit=6&addressdetails=1&featureType=city' +
          `&accept-language=${encodeURIComponent(language)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'LocalUp/1.0',
          },
          signal: controller.signal,
        });
        const json: NominatimPlace[] = await res.json();
        // A newer search started while this one was in flight — its results
        // are the truth, so drop these rather than overwriting.
        if (controller.signal.aborted) return;
        setResults(toCityOptions(json));
      } catch {
        // An abort is expected (superseded or timed out) and must NOT wipe the
        // list the newer search is about to fill.
        if (controller.signal.aborted) return;
        setResults([]);
      } finally {
        clearTimeout(timeout);
        if (inFlightRef.current === controller) {
          inFlightRef.current = null;
        }
      }
    },
    [language],
  );

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      setSelectedCity('');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        searchCities(text);
      }, DEBOUNCE_MS);
    },
    [searchCities],
  );

  // The city ALONE is what gets stored and shown from here on. It used
  // to be Nominatim's display_name, so a profile read "Λάρισα, Δημοτική
  // Ενότητα Λαρισαίων, …, 422 22, Ελλάς" where it meant "Λάρισα".
  const onSelectCity = useCallback(
    (item: CityOption) => {
      setQuery(item.name);
      setSelectedCity(item.name);
      setResults([]);
      update({
        homeCity: item.name,
        homeLat: item.lat,
        homeLng: item.lng,
      });
    },
    [update],
  );

  const onNext = () => {
    router.push(Routes.onboarding.photo);
  };

  // Two lines, as drawn: the place, then only as much of where it is as
  // is needed to tell it from the row above.
  const renderItem = ({ item }: { item: CityOption }) => (
    <Pressable
      onPress={() => onSelectCity(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.region}`}
      style={[
        styles.resultItem,
        {
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <AppText
        variant="rowTitleQuiet"
        numberOfLines={1}
        style={{
          color: theme.colors.onSurface,
        }}
      >
        {item.name}
      </AppText>
      {item.region ? (
        <AppText
          variant="caption"
          numberOfLines={1}
          style={{
            color: theme.colors.onSurfaceFaint,
          }}
        >
          {item.region}
        </AppText>
      ) : null}
    </Pressable>
  );

  return (
    <OnboardingShell
      step={2}
      totalSteps={4}
      title={t(Translations.ONBOARDING_STEP_2_TITLE)}
      subtitle={t(Translations.ONBOARDING_STEP_2_SUBTITLE)}
      actionLabel={t(Translations.ONBOARDING_NEXT)}
      onAction={onNext}
      actionDisabled={!selectedCity}
    >
      <View>
        <AppText
          variant="caption"
          style={[
            styles.label,
            {
              color: theme.colors.onSurfaceFaint,
            },
          ]}
        >
          {t(Translations.ONBOARDING_CITY_LABEL)}
        </AppText>
        <View
          style={[
            styles.field,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: selectedCity
                ? theme.colors.outlineSelected
                : theme.colors.outlineVariant,
            },
          ]}
        >
          <AppIcon
            name="magnify"
            size={Layout.FIELD_ICON}
            color={theme.colors.onSurfaceFaint}
          />
          <TextInput
            value={query}
            onChangeText={onChangeText}
            placeholder={t(Translations.ONBOARDING_CITY_LABEL)}
            placeholderTextColor={theme.colors.onSurfaceFaint}
            style={[
              styles.input,
              Typography.message.style,
              {
                color: theme.colors.onSurface,
              },
            ]}
          />
        </View>
      </View>

      {results.length > 0 ? (
        <View
          style={[
            styles.resultsList,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <FlatList
            data={results}
            keyExtractor={item => String(item.placeId)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
          />
        </View>
      ) : null}
    </OnboardingShell>
  );
};

export default HomeCityScreen;

const styles = StyleSheet.create({
  label: {
    marginBottom: Layout.FIELD_LABEL_GAP,
  },
  field: {
    minHeight: Layout.FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.FIELD_INNER_GAP,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  resultsList: {
    borderWidth: 1,
    borderRadius: Layout.FIELD_RADIUS,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  resultItem: {
    gap: 2,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
