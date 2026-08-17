import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { HelperText, TextInput, useTheme } from 'react-native-paper';
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

  // V2: this was mode/reValidateMode 'onBlur'. `isValid` only recomputed
  // when the field lost focus, so Next stayed disabled — with a filled-in
  // name and a picked date sitting right there — until the user thought
  // to dismiss the keyboard. Validate as they type: the button's enabled
  // state has to track what's on screen, not what was on screen the last
  // time focus moved.
  const form = useForm<NameAgeForm>({
    defaultValues: {
      displayName: data.displayName,
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
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

        <Spacer spacing={Spacing.SPACING_PADDING_16} />

        {/* The same Paper field as the name above, rather than a bespoke box.
            It used to be a bordered Pressable with its own label on top AND
            "Date of Birth" repeated inside as the placeholder — the label said
            itself twice, and the box was taller and rounder than the field it
            sat under. Reusing the input gives the floating label, the matching
            shape and the error state for free; the calendar icon is what says
            it opens a picker. pointerEvents="none" keeps the taps on the
            Pressable instead of the (non-editable) field swallowing them. */}
        <Pressable onPress={() => setShowPicker(true)}>
          <View pointerEvents="none">
            <TextInput
              label={t(Translations.ONBOARDING_DOB_LABEL)}
              mode="outlined"
              value={dob ? formatDate(dob) : ''}
              editable={false}
              error={!!dobError}
              right={<TextInput.Icon icon="calendar" />}
            />
          </View>
        </Pressable>

        {dobError ? (
          <HelperText type="error" visible padding="none">
            {dobError}
          </HelperText>
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
  bottomSection: {
    marginTop: 'auto',
    paddingTop: Spacing.SPACING_PADDING_32,
  },
});
