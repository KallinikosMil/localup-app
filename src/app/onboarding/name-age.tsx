import React, { useMemo, useState } from 'react';
import { Routes } from '@shared/routes';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import InputField from '@shared/components/InputField';
import OnboardingShell from '@features/onboarding/components/OnboardingShell';
import BirthDateField from '@features/onboarding/components/BirthDateField';
import {
  evaluateDob,
  type DobInput,
  type DobResult,
} from '@features/onboarding/utils/birthDate';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { Translations } from '@features/onboarding/i18n/translationKeys';

type NameAgeForm = {
  displayName: string;
};

const NameAgeScreen = () => {
  const { t } = useTranslation();

  const { data, update } = useOnboardingData();

  // Read ONCE per mount rather than per keystroke, so a date cannot
  // change its verdict mid-session at midnight.
  const today = useMemo(() => new Date(), []);

  // The three boxes hold STRINGS, not a Date: '0' and '00' are different
  // things to someone mid-typing, and a Date cannot represent a half-
  // entered value at all.
  const [dobInput, setDobInput] = useState<DobInput>(() =>
    data.dateOfBirth
      ? {
          day: String(data.dateOfBirth.getDate()),
          month: String(data.dateOfBirth.getMonth() + 1),
          year: String(data.dateOfBirth.getFullYear()),
        }
      : { day: '', month: '', year: '' },
  );
  const [dobResult, setDobResult] = useState<DobResult>(() =>
    evaluateDob(dobInput, today),
  );

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
    // The button is already gated on this; the guard stays because a
    // submit can also arrive from the keyboard.
    if (dobResult.kind !== 'ok') return;
    update({
      displayName,
      dateOfBirth: dobResult.date,
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
      //  is react-hook-form's and covers only the name. The date
      // lives outside the form, and "legal" for it means 18+ as well as
      // real — so the gate names both things the step asks for.
      actionDisabled={!isValid || dobResult.kind !== 'ok'}
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

      <BirthDateField
        value={dobInput}
        today={today}
        onChange={(next, result) => {
          setDobInput(next);
          setDobResult(result);
        }}
      />
    </OnboardingShell>
  );
};

export default NameAgeScreen;
