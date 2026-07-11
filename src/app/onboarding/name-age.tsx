import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import Spacer from '@shared/components/Spacer';
import InputField from '@shared/components/InputField';
import OnboardingProgress from '@shared/components/OnboardingProgress';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';

type NameAgeForm = {
  displayName: string;
};

const getMaxDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const NameAgeScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data, update } = useOnboardingData();

  const maxDate = getMaxDate();

  const [dob, setDob] = useState<Date | null>(data.dateOfBirth);
  const [showPicker, setShowPicker] = useState(false);
  const [dobError, setDobError] = useState('');

  const form = useForm<NameAgeForm>({
    defaultValues: {
      displayName: data.displayName,
    },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const {
    handleSubmit,
    formState: { isValid },
  } = form;

  const onDateChange = (_event: unknown, selected?: Date) => {
    setShowPicker(false);
    if (selected) {
      setDob(selected);
      setDobError('');
    }
  };

  const onNext = handleSubmit(({ displayName }) => {
    if (!dob) {
      setDobError(t(Translations.ONBOARDING_DOB_REQUIRED));
      return;
    }
    update({
      displayName,
      dateOfBirth: dob,
    });
    router.push('/onboarding/home-city');
  });

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
          step={1}
          totalSteps={4}
          title={t(Translations.ONBOARDING_STEP_1_TITLE)}
          showBack={false}
        />

        <Spacer spacing={Spacing.SPACING_PADDING_8} />

        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {t(Translations.ONBOARDING_STEP_1_SUBTITLE)}
        </AppText>

        <Spacer spacing={Spacing.SPACING_PADDING_32} />

        <FormProvider {...form}>
          <InputField
            name="displayName"
            label={t(Translations.ONBOARDING_NAME_LABEL)}
            rules={{
              required: {
                value: true,
                message: t(Translations.ONBOARDING_NAME_REQUIRED),
              },
            }}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </FormProvider>

        <Spacer spacing={Spacing.SPACING_PADDING_24} />

        <AppText
          variant="label"
          style={{
            color: theme.colors.onBackground,
            marginBottom: Spacing.SPACING_PADDING_8,
          }}
        >
          {t(Translations.ONBOARDING_DOB_LABEL)}
        </AppText>

        <Pressable
          onPress={() => setShowPicker(true)}
          style={[
            styles.dobButton,
            {
              borderColor: dobError ? theme.colors.error : theme.colors.outline,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <AppText
            variant="body"
            style={{
              color: dob
                ? theme.colors.onSurface
                : theme.colors.onSurfaceVariant,
            }}
          >
            {dob ? formatDate(dob) : t(Translations.ONBOARDING_DOB_LABEL)}
          </AppText>
        </Pressable>

        {dobError ? (
          <AppText
            variant="caption"
            style={{
              color: theme.colors.error,
              marginTop: 4,
            }}
          >
            {dobError}
          </AppText>
        ) : null}

        {showPicker ? (
          <DateTimePicker
            value={dob ?? maxDate}
            mode="date"
            display="spinner"
            maximumDate={maxDate}
            onChange={onDateChange}
            positiveButton={{
              label: t(Translations.ONBOARDING_PICKER_OK),
              textColor: theme.colors.primary,
            }}
            negativeButton={{
              label: t(Translations.ONBOARDING_PICKER_CANCEL),
              textColor: theme.colors.primary,
            }}
          />
        ) : null}

        <View style={styles.bottomSection}>
          <AppButton variant="primary" onPress={onNext} disabled={!isValid}>
            {t(Translations.ONBOARDING_NEXT)}
          </AppButton>
        </View>
      </ScrollView>
    </View>
  );
};

export default NameAgeScreen;

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
  dobButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.SPACING_PADDING_16,
    paddingHorizontal: Spacing.SPACING_PADDING_16,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: Spacing.SPACING_PADDING_32,
  },
});
