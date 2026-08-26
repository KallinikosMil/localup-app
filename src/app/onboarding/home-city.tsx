import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, FlatList, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import OnboardingShell from '@features/onboarding/components/OnboardingShell';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

type CityResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

const DEBOUNCE_MS = 300;
// Shorter than the app's 15s Supabase budget: this is a type-ahead, and a
// suggestion that arrives after several seconds is useless anyway.
const SEARCH_TIMEOUT_MS = 8000;

const HomeCityScreen = () => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { data, update } = useOnboardingData();

  const [query, setQuery] = useState(data.homeCity);
  const [results, setResults] = useState<CityResult[]>([]);
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
  const searchCities = useCallback(async (text: string) => {
    inFlightRef.current?.abort();

    if (text.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    inFlightRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1&featuretype=city`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'LocalUp/1.0',
        },
        signal: controller.signal,
      });
      const json: CityResult[] = await res.json();
      // A newer search started while this one was in flight — its results
      // are the truth, so drop these rather than overwriting.
      if (controller.signal.aborted) return;
      setResults(json);
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
  }, []);

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

  const onSelectCity = useCallback(
    (item: CityResult) => {
      const name = item.display_name;
      setQuery(name);
      setSelectedCity(name);
      setResults([]);
      update({
        homeCity: name,
        homeLat: parseFloat(item.lat),
        homeLng: parseFloat(item.lon),
      });
    },
    [update],
  );

  const onNext = () => {
    router.push('/onboarding/photo');
  };

  const renderItem = ({ item }: { item: CityResult }) => (
    <Pressable
      onPress={() => onSelectCity(item)}
      accessibilityRole="button"
      accessibilityLabel={item.display_name}
      style={[
        styles.resultItem,
        {
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <AppText
        variant="body"
        style={{
          color: theme.colors.onSurface,
        }}
      >
        {item.display_name}
      </AppText>
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
          <MaterialCommunityIcons
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
            keyExtractor={item => String(item.place_id)}
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
