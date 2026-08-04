import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  FlatList,
  Pressable,
} from 'react-native';
import { TextInput, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import Spacer from '@shared/components/Spacer';
import OnboardingProgress from '@shared/components/OnboardingProgress';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';

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
  const theme = useTheme();
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
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingProgress
          step={2}
          totalSteps={4}
          title={t(Translations.ONBOARDING_STEP_2_TITLE)}
        />

        <Spacer spacing={Spacing.SPACING_PADDING_8} />

        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {t(Translations.ONBOARDING_STEP_2_SUBTITLE)}
        </AppText>

        <Spacer spacing={Spacing.SPACING_PADDING_32} />

        <TextInput
          label={t(Translations.ONBOARDING_CITY_LABEL)}
          value={query}
          onChangeText={onChangeText}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" />}
        />

        {results.length > 0 ? (
          <View
            style={[
              styles.resultsList,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
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

        <Spacer spacing={Spacing.SPACING_PADDING_16} />

        <AppText
          variant="caption"
          style={{
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {t(Translations.ONBOARDING_CITY_EXPLANATION)}
        </AppText>

        <View style={styles.bottomSection}>
          <AppButton
            variant="primary"
            onPress={onNext}
            disabled={!selectedCity}
          >
            {t(Translations.ONBOARDING_NEXT)}
          </AppButton>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeCityScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingTop: Spacing.SPACING_PADDING_24,
    paddingBottom: Spacing.SPACING_PADDING_32,
  },
  resultsList: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.SPACING_PADDING_8,
  },
  resultItem: {
    paddingVertical: Spacing.SPACING_PADDING_16,
    paddingHorizontal: Spacing.SPACING_PADDING_16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: Spacing.SPACING_PADDING_32,
  },
});
