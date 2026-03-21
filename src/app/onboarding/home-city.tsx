import React, {
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Pressable,
} from 'react-native';
import {
  Button,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
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

const HomeCityScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data, update } = useOnboardingData();

  const [query, setQuery] = useState(
    data.homeCity,
  );
  const [results, setResults] = useState<
    CityResult[]
  >([]);
  const [selectedCity, setSelectedCity] =
    useState(data.homeCity);
  const timerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const searchCities = useCallback(
    async (text: string) => {
      if (text.length < 2) {
        setResults([]);
        return;
      }
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1&featuretype=city`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'LocalUp/1.0',
          },
        });
        const json: CityResult[] =
          await res.json();
        setResults(json);
      } catch {
        setResults([]);
      }
    },
    [],
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

  const renderItem = ({
    item,
  }: {
    item: CityResult;
  }) => (
    <Pressable
      onPress={() => onSelectCity(item)}
      style={[
        styles.resultItem,
        {
          borderBottomColor:
            theme.colors.outlineVariant,
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
    <KeyboardAvoidingView
      style={[
        styles.root,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.progress}>
          <AppText
            variant="caption"
            style={{
              color:
                theme.colors
                  .onSurfaceVariant,
            }}
          >
            2 / 4
          </AppText>
        </View>

        <Spacer
          spacing={Spacing.SPACING_PADDING_16}
        />

        <AppText
          variant="h2"
          style={{
            color:
              theme.colors.onBackground,
          }}
        >
          {t(
            Translations.ONBOARDING_STEP_2_TITLE,
          )}
        </AppText>

        <Spacer
          spacing={Spacing.SPACING_PADDING_8}
        />

        <AppText
          variant="body"
          style={{
            color:
              theme.colors.onSurfaceVariant,
          }}
        >
          {t(
            Translations.ONBOARDING_STEP_2_SUBTITLE,
          )}
        </AppText>

        <Spacer
          spacing={Spacing.SPACING_PADDING_32}
        />

        <TextInput
          label={t(
            Translations.ONBOARDING_CITY_LABEL,
          )}
          value={query}
          onChangeText={onChangeText}
          mode="outlined"
          left={
            <TextInput.Icon icon="magnify" />
          }
        />

        {results.length > 0 && (
          <View
            style={[
              styles.resultsList,
              {
                backgroundColor:
                  theme.colors.surface,
                borderColor:
                  theme.colors.outline,
              },
            ]}
          >
            <FlatList
              data={results}
              keyExtractor={item =>
                String(item.place_id)
              }
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={false}
            />
          </View>
        )}

        <Spacer
          spacing={Spacing.SPACING_PADDING_16}
        />

        <AppText
          variant="caption"
          style={{
            color:
              theme.colors.onSurfaceVariant,
          }}
        >
          {t(
            Translations.ONBOARDING_CITY_EXPLANATION,
          )}
        </AppText>

        <View style={styles.bottomSection}>
          <Button
            mode="contained"
            onPress={onNext}
            disabled={!selectedCity}
            contentStyle={styles.btnContent}
            style={styles.pillBtn}
          >
            {t(Translations.ONBOARDING_NEXT)}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default HomeCityScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
    paddingTop: Spacing.SPACING_PADDING_60,
    paddingBottom:
      Spacing.SPACING_PADDING_32,
  },
  progress: {
    alignItems: 'flex-end',
  },
  resultsList: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.SPACING_PADDING_8,
  },
  resultItem: {
    paddingVertical:
      Spacing.SPACING_PADDING_16,
    paddingHorizontal:
      Spacing.SPACING_PADDING_16,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: Spacing.SPACING_PADDING_32,
  },
  pillBtn: {
    borderRadius: BorderRadius.pill,
  },
  btnContent: {
    height: 52,
  },
});
