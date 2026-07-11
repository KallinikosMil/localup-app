import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { TextInput, ActivityIndicator, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import Spacer from '@shared/components/Spacer';
import InterestChip from '@shared/components/InterestChip';
import OnboardingProgress from '@shared/components/OnboardingProgress';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { useCompleteOnboarding } from '@features/onboarding/hooks/useOnboarding';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { supabase } from '@config/supabase';
import { Spacing } from '@theme/constants/Spacing';

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 5;

type Interest = {
  id: string;
  name: string;
  icon: string | null;
  category: string;
  is_active: boolean;
};

const InterestsScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: onboardingData, update } = useOnboardingData();

  const [selectedIds, setSelectedIds] = useState<string[]>(
    onboardingData.interestIds,
  );
  const [bio, setBio] = useState(onboardingData.bio);

  // H2: `isError` is the whole point here. The Finish mutation had no
  // onError and no error UI — on failure the spinner just stopped and
  // NOTHING happened, so a user could never leave onboarding and never
  // know why.
  const {
    mutate,
    isPending,
    isError: finishFailed,
    reset: resetFinish,
  } = useCompleteOnboarding();

  const {
    data: interests = [],
    isLoading,
    // H2: with no error branch a failed list rendered ZERO categories,
    // and since Finish needs >= 3 selections the user was permanently
    // stuck in onboarding with no explanation.
    isError: interestsFailed,
    refetch: refetchInterests,
  } = useQuery({
    queryKey: ['interests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as Interest[];
    },
  });

  const grouped = interests.reduce<Record<string, Interest[]>>(
    (acc, interest) => {
      const cat = interest.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(interest);
      return acc;
    },
    {},
  );

  const toggleInterest = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= MAX_INTERESTS) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const canFinish = selectedIds.length >= MIN_INTERESTS;

  const onFinish = () => {
    // Clear a previous failure so the error text disappears while the
    // retry is in flight.
    resetFinish();

    update({
      interestIds: selectedIds,
      bio,
    });

    mutate({
      displayName: onboardingData.displayName,
      dateOfBirth:
        onboardingData.dateOfBirth?.toISOString().split('T')[0] ?? '',
      homeCity: onboardingData.homeCity,
      homeLat: onboardingData.homeLat ?? 0,
      homeLng: onboardingData.homeLng ?? 0,
      photoUri: onboardingData.photoUri ?? '',
      interestIds: selectedIds,
      bio,
    });
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingProgress
          step={4}
          totalSteps={4}
          title={t(Translations.ONBOARDING_STEP_4_TITLE)}
        />

        <Spacer spacing={Spacing.SPACING_PADDING_8} />

        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {t(Translations.ONBOARDING_STEP_4_SUBTITLE)}
        </AppText>

        <Spacer spacing={Spacing.SPACING_PADDING_16} />

        <AppText
          variant="caption"
          style={{
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {selectedIds.length}/{MAX_INTERESTS} selected
        </AppText>

        <Spacer spacing={Spacing.SPACING_PADDING_8} />

        {isLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : interestsFailed ? (
          <View style={styles.errorBlock}>
            <AppText
              variant="body"
              style={{
                color: theme.colors.error,
                textAlign: 'center',
              }}
            >
              {t(Translations.ONBOARDING_INTERESTS_ERROR)}
            </AppText>
            <Spacer spacing={Spacing.SPACING_PADDING_12} />
            <AppButton variant="outlined" onPress={() => refetchInterests()}>
              {t(Translations.ONBOARDING_RETRY)}
            </AppButton>
          </View>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <View key={category} style={styles.categoryBlock}>
              <AppText
                variant="label"
                style={{
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                {category}
              </AppText>
              <View style={styles.chipRow}>
                {items.map(interest => (
                  <InterestChip
                    key={interest.id}
                    label={interest.name}
                    icon={interest.icon ?? undefined}
                    selected={selectedIds.includes(interest.id)}
                    onPress={() => toggleInterest(interest.id)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        {!canFinish && selectedIds.length > 0 && (
          <>
            <Spacer spacing={Spacing.SPACING_PADDING_8} />
            <AppText
              variant="caption"
              style={{
                color: theme.colors.error,
              }}
            >
              {t(Translations.ONBOARDING_INTERESTS_MIN)}
            </AppText>
          </>
        )}

        <Spacer spacing={Spacing.SPACING_PADDING_24} />

        <TextInput
          label={t(Translations.ONBOARDING_BIO_LABEL)}
          placeholder={t(Translations.ONBOARDING_BIO_PLACEHOLDER)}
          value={bio}
          onChangeText={setBio}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.bioInput}
        />

        <View style={styles.bottomSection}>
          {finishFailed ? (
            <>
              <AppText
                variant="body"
                style={{
                  color: theme.colors.error,
                  textAlign: 'center',
                }}
              >
                {t(Translations.ONBOARDING_FINISH_ERROR)}
              </AppText>
              <Spacer spacing={Spacing.SPACING_PADDING_12} />
            </>
          ) : null}

          {isPending ? (
            <ActivityIndicator size="large" />
          ) : (
            <AppButton
              variant="primary"
              onPress={onFinish}
              disabled={!canFinish}
            >
              {finishFailed
                ? t(Translations.ONBOARDING_RETRY)
                : t(Translations.ONBOARDING_FINISH)}
            </AppButton>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default InterestsScreen;

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
  categoryBlock: {
    marginBottom: Spacing.SPACING_PADDING_16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.SPACING_PADDING_8,
  },
  loader: {
    marginVertical: Spacing.SPACING_PADDING_32,
  },
  errorBlock: {
    alignItems: 'center',
    marginVertical: Spacing.SPACING_PADDING_32,
  },
  bioInput: {
    maxHeight: 120,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: Spacing.SPACING_PADDING_32,
  },
});
