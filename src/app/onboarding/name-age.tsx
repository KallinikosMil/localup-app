import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Routes } from '@shared/routes';
import AppIcon from '@shared/components/AppIcon';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import InputField from '@shared/components/InputField';
import OnboardingShell from '@features/onboarding/components/OnboardingShell';
import BirthDatePicker from '@features/onboarding/components/BirthDatePicker';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { formatDate } from '@shared/utils/date';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Layout } from '@theme/constants/Layout';

type NameAgeForm = {
  displayName: string;
};

const getMaxDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

const NameAgeScreen = () => {
  const { t, i18n } = useTranslation();

  // The shared helper takes the language explicitly; this wrapper just
  // pins the one option set this screen uses.
  const shownDate = (d: Date) =>
    formatDate(d, i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  const theme = useAppTheme();
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

  const onNext = handleSubmit(({ displayName }) => {
    if (!dob) {
      setDobError(t(Translations.ONBOARDING_DOB_REQUIRED));
      return;
    }
    update({
      displayName,
      dateOfBirth: dob,
    });
    router.push(Routes.onboarding.homeCity);
  });

  return (
    <OnboardingShell
      step={1}
      totalSteps={4}
      showBack={false}
      title={t(Translations.ONBOARDING_STEP_1_TITLE)}
      subtitle={t(Translations.ONBOARDING_STEP_1_SUBTITLE)}
      actionLabel={t(Translations.ONBOARDING_NEXT)}
      onAction={onNext}
      // `isValid` is react-hook-form's, and the date is not a form field —
      // it is separate state. So a filled-in name alone lit the button up
      // while pressing it could only ever produce an error. The gate has
      // to name both things the step asks for.
      actionDisabled={!isValid || !dob}
    >
      <FormProvider {...form}>
        <InputField
          name="displayName"
          icon="account-outline"
          label={t(Translations.ONBOARDING_NAME_LABEL)}
          helper={t(Translations.ONBOARDING_NAME_HELPER)}
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

      {/* Built to match InputField rather than reusing it: this opens a
          picker instead of taking typing, and a real TextInput made
          non-editable is a field that looks focusable and is not. The
          label, box and helper line below are the same shapes, so the two
          read as one form. */}
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
          {t(Translations.ONBOARDING_DOB_LABEL)}
        </AppText>

        <Pressable
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={t(Translations.ONBOARDING_DOB_LABEL)}
          accessibilityValue={{ text: dob ? shownDate(dob) : '' }}
          style={[
            styles.box,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: dobError
                ? theme.colors.errorFieldOutline
                : theme.colors.outlineVariant,
              borderWidth:
                dobError && !theme.dark
                  ? Layout.FIELD_BORDER_ERROR_LIGHT
                  : Layout.FIELD_BORDER,
            },
          ]}
        >
          <AppIcon
            name="calendar-outline"
            size={Layout.FIELD_ICON}
            color={theme.colors.onSurfaceFaint}
          />
          <AppText
            variant="message"
            style={[
              styles.value,
              {
                color: dob
                  ? theme.colors.onSurface
                  : theme.colors.onSurfaceFaint,
              },
            ]}
          >
            {dob ? shownDate(dob) : t(Translations.ONBOARDING_DOB_PLACEHOLDER)}
          </AppText>
          <AppIcon
            name="chevron-right"
            size={18}
            color={theme.colors.onSurfaceFaint}
          />
        </Pressable>

        <View style={styles.helper}>
          {dobError ? (
            <AppIcon
              name="alert-circle-outline"
              size={Layout.FIELD_ERROR_ICON}
              color={theme.colors.error}
            />
          ) : null}
          <AppText
            variant="caption"
            style={[
              styles.helperText,
              {
                color: dobError
                  ? theme.colors.error
                  : theme.colors.onSurfaceFaint,
              },
            ]}
          >
            {/* The reassurance is the point: people hesitate over a birth
                date, and it is true — only the age ever leaves the
                server. */}
            {dobError || t(Translations.ONBOARDING_DOB_HELPER)}
          </AppText>
        </View>
      </View>

      <BirthDatePicker
        visible={showPicker}
        initial={dob}
        maxDate={maxDate}
        onCancel={() => setShowPicker(false)}
        onConfirm={picked => {
          setShowPicker(false);
          setDob(picked);
          setDobError('');
        }}
      />
    </OnboardingShell>
  );
};

export default NameAgeScreen;

const styles = StyleSheet.create({
  label: {
    marginBottom: Layout.FIELD_LABEL_GAP,
  },
  box: {
    minHeight: Layout.FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.FIELD_INNER_GAP,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
  },
  value: {
    flex: 1,
  },
  helper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.FIELD_ERROR_GAP,
    marginTop: Layout.FIELD_LABEL_GAP,
  },
  helperText: {
    flex: 1,
  },
});
