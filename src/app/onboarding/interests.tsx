import React, { useState } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import Spacer from '@shared/components/Spacer';
import InterestChip from '@shared/components/InterestChip';
import OnboardingShell from '@features/onboarding/components/OnboardingShell';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { toISODate } from '@shared/utils/date';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { useCompleteOnboarding } from '@features/onboarding/hooks/useOnboarding';
import { supabase } from '@config/supabase';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 5;

// category and is_active are NOT NULL in the database as of the
// interests_category_and_is_active_not_null migration. They were nullable
// before while this type said otherwise, and `data as Interest[]` below
// hid the mismatch from the compiler — a null category would have grouped
// under the string "null" and rendered a heading reading exactly that.
// icon stays optional because it genuinely is.
type Interest = {
  id: string;
  name: string;
  icon: string | null;
  category: string;
  is_active: boolean;
};

// Which earlier step the user has to return to, and what to tell them.
type MissingField = 'dob' | 'city' | 'photo';

const MISSING_MESSAGE: Record<MissingField, string> = {
  dob: Translations.ONBOARDING_MISSING_DOB,
  city: Translations.ONBOARDING_MISSING_CITY,
  photo: Translations.ONBOARDING_MISSING_PHOTO,
};

const MISSING_ROUTE: Record<MissingField, string> = {
  dob: '/onboarding/name-age',
  city: '/onboarding/home-city',
  photo: '/onboarding/photo',
};

const InterestsScreen = () => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const errorMessage = useErrorMessage();
  const { data: onboardingData, update } = useOnboardingData();

  const [selectedIds, setSelectedIds] = useState<string[]>(
    onboardingData.interestIds,
  );
  const [bio, setBio] = useState(onboardingData.bio);
  const [missing, setMissing] = useState<MissingField | null>(null);

  // H2: `isError` is the whole point here. The Finish mutation had no
  // onError and no error UI — on failure the spinner just stopped and
  // NOTHING happened, so a user could never leave onboarding and never
  // know why.
  const {
    mutate,
    isPending,
    isError: finishFailed,
    error: finishError,
    reset: resetFinish,
  } = useCompleteOnboarding();

  const {
    data: interests = [],
    isLoading,
    // H2: with no error branch a failed list rendered ZERO categories,
    // and since Finish needs >= 3 selections the user was permanently
    // stuck in onboarding with no explanation.
    isError: interestsFailed,
    error: interestsError,
    refetch: refetchInterests,
  } = useQuery({
    queryKey: ['interests'],
    queryFn: async () => {
      // Ordered on the server, because a SELECT without ORDER BY has no
      // order to promise: the same query can hand back the categories — and
      // the chips inside them — in a different arrangement on every load, so
      // the grid a user learned the shape of quietly rearranges itself.
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');
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
    setMissing(null);

    // H3 — NULL ISLAND. This used to be `homeLat: ?? 0, homeLng: ?? 0,
    // photoUri: ?? ''`: missing coordinates were silently written as
    // (0, 0) — a real location in the Gulf of Guinea — which poisons
    // every distance calculation the app makes, forever, with no error.
    // A missing value is NOT a zero. Refuse, and tell the user exactly
    // which step to go back to.
    // See toISODate: a birthdate is a calendar date, and toISOString would
    // shift it a day for every user east of UTC. It lives in shared/utils now
    // so the rule can be tested instead of trusted.
    const dob = onboardingData.dateOfBirth;
    const dateOfBirth = dob ? toISODate(dob) : '';
    const { homeLat, homeLng, photoUri } = onboardingData;

    if (!dateOfBirth) {
      setMissing('dob');
      return;
    }
    if (homeLat == null || homeLng == null) {
      setMissing('city');
      return;
    }
    if (!photoUri) {
      setMissing('photo');
      return;
    }

    update({
      interestIds: selectedIds,
      bio,
    });

    mutate({
      displayName: onboardingData.displayName,
      dateOfBirth,
      homeCity: onboardingData.homeCity,
      homeLat,
      homeLng,
      photoUri,
      interestIds: selectedIds,
      bio,
    });
  };

  return (
    <OnboardingShell
      step={4}
      totalSteps={4}
      title={t(Translations.ONBOARDING_STEP_4_TITLE)}
      subtitle={t(Translations.ONBOARDING_STEP_4_SUBTITLE)}
      actionLabel={
        finishFailed
          ? t(Translations.ONBOARDING_RETRY)
          : t(Translations.ONBOARDING_FINISH)
      }
      onAction={onFinish}
      actionDisabled={!canFinish || isPending}
    >
      <AppText
        variant="caption"
        style={{
          color: theme.colors.onSurfaceVariant,
        }}
      >
        {t(Translations.ONBOARDING_INTERESTS_SELECTED, {
          selected: selectedIds.length,
          max: MAX_INTERESTS,
        })}
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
            {errorMessage(
              interestsError,
              Translations.ONBOARDING_INTERESTS_ERROR,
            )}
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

      {!canFinish && selectedIds.length > 0 ? (
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
      ) : null}

      <Spacer spacing={Spacing.SPACING_PADDING_24} />

      <View>
        <AppText
          variant="caption"
          style={[
            styles.fieldLabel,
            {
              color: theme.colors.onSurfaceFaint,
            },
          ]}
        >
          {t(Translations.ONBOARDING_BIO_LABEL)}
        </AppText>
        <TextInput
          placeholder={t(Translations.ONBOARDING_BIO_PLACEHOLDER)}
          placeholderTextColor={theme.colors.onSurfaceFaint}
          value={bio}
          onChangeText={setBio}
          multiline
          style={[
            styles.bioInput,
            Typography.message.style,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.outlineVariant,
              color: theme.colors.onSurface,
            },
          ]}
        />
      </View>

      <View style={styles.notices}>
        {missing ? (
          <>
            <AppText
              variant="body"
              style={{
                color: theme.colors.error,
                textAlign: 'center',
              }}
            >
              {t(MISSING_MESSAGE[missing])}
            </AppText>
            <Spacer spacing={Spacing.SPACING_PADDING_12} />
            <AppButton
              variant="outlined"
              onPress={() => router.push(MISSING_ROUTE[missing])}
            >
              {t(Translations.ONBOARDING_GO_BACK)}
            </AppButton>
            <Spacer spacing={Spacing.SPACING_PADDING_12} />
          </>
        ) : null}

        {finishFailed ? (
          <>
            <AppText
              variant="body"
              style={{
                color: theme.colors.error,
                textAlign: 'center',
              }}
            >
              {errorMessage(finishError, Translations.ONBOARDING_FINISH_ERROR)}
            </AppText>
            <Spacer spacing={Spacing.SPACING_PADDING_12} />
          </>
        ) : null}

        {isPending ? <ActivityIndicator size="large" /> : null}
      </View>
    </OnboardingShell>
  );
};

export default InterestsScreen;

const styles = StyleSheet.create({
  fieldLabel: {
    marginBottom: Layout.FIELD_LABEL_GAP,
  },
  notices: {
    alignItems: 'center',
  },
  categoryBlock: {
    marginBottom: Spacing.SPACING_PADDING_16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.SPACING_PADDING_8,
    // Spacing belongs to the row, not to each chip. A per-chip margin also
    // padded the outside edges, so the grid sat inset from the headings above
    // it and the wrapped rows never lined up with the screen's gutter.
    gap: Spacing.SPACING_PADDING_8,
  },
  loader: {
    marginVertical: Spacing.SPACING_PADDING_32,
  },
  errorBlock: {
    alignItems: 'center',
    marginVertical: Spacing.SPACING_PADDING_32,
  },
  bioInput: {
    minHeight: Layout.FIELD_HEIGHT * 2,
    maxHeight: Layout.FIELD_HEIGHT * 3,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    textAlignVertical: 'top',
  },
});
