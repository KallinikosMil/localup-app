import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import InputField from '@shared/components/InputField';
import OnboardingShell from '@features/onboarding/components/OnboardingShell';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
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

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const NameAgeScreen = () => {
  const { t } = useTranslation();
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
    <OnboardingShell
      step={1}
      totalSteps={4}
      showBack={false}
      title={t(Translations.ONBOARDING_STEP_1_TITLE)}
      subtitle={t(Translations.ONBOARDING_STEP_1_SUBTITLE)}
      actionLabel={t(Translations.ONBOARDING_NEXT)}
      onAction={onNext}
      actionDisabled={!isValid}
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
          accessibilityValue={{ text: dob ? formatDate(dob) : '' }}
          style={[
            styles.box,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: dobError
                ? theme.colors.error
                : theme.colors.outlineVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
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
            {dob ? formatDate(dob) : t(Translations.ONBOARDING_DOB_PLACEHOLDER)}
          </AppText>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={theme.colors.onSurfaceFaint}
          />
        </Pressable>

        <AppText
          variant="caption"
          style={[
            styles.helper,
            {
              color: dobError
                ? theme.colors.error
                : theme.colors.onSurfaceFaint,
            },
          ]}
        >
          {/* The reassurance is the point: people hesitate over a birth
              date, and it is true — only the age ever leaves the server. */}
          {dobError || t(Translations.ONBOARDING_DOB_HELPER)}
        </AppText>
      </View>

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
    marginTop: Layout.FIELD_LABEL_GAP,
  },
});
