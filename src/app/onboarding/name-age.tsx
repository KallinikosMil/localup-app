import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  FormProvider,
  useForm,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import InputField from '@shared/components/InputField';
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

  const [dob, setDob] = useState<Date | null>(
    data.dateOfBirth,
  );
  const [showPicker, setShowPicker] =
    useState(false);
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

  const onDateChange = (
    _event: unknown,
    selected?: Date,
  ) => {
    setShowPicker(Platform.OS === 'ios');
    if (selected) {
      setDob(selected);
      setDobError('');
    }
  };

  const onNext = handleSubmit(
    ({ displayName }) => {
      if (!dob) {
        setDobError(
          t(
            Translations.ONBOARDING_DOB_REQUIRED,
          ),
        );
        return;
      }
      update({
        displayName,
        dateOfBirth: dob,
      });
      router.push('/onboarding/home-city');
    },
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
            1 / 4
          </AppText>
        </View>

        <Spacer
          spacing={Spacing.SPACING_PADDING_16}
        />

        <AppText
          variant="h2"
          style={{
            color: theme.colors.onBackground,
          }}
        >
          {t(
            Translations.ONBOARDING_STEP_1_TITLE,
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
            Translations.ONBOARDING_STEP_1_SUBTITLE,
          )}
        </AppText>

        <Spacer
          spacing={Spacing.SPACING_PADDING_32}
        />

        <FormProvider {...form}>
          <InputField
            name="displayName"
            label={t(
              Translations.ONBOARDING_NAME_LABEL,
            )}
            rules={{
              required: {
                value: true,
                message: t(
                  Translations.ONBOARDING_NAME_REQUIRED,
                ),
              },
            }}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </FormProvider>

        <Spacer
          spacing={Spacing.SPACING_PADDING_24}
        />

        <AppText
          variant="label"
          style={{
            color: theme.colors.onBackground,
            marginBottom:
              Spacing.SPACING_PADDING_8,
          }}
        >
          {t(
            Translations.ONBOARDING_DOB_LABEL,
          )}
        </AppText>

        <Pressable
          onPress={() => setShowPicker(true)}
          style={[
            styles.dobButton,
            {
              borderColor: dobError
                ? theme.colors.error
                : theme.colors.outline,
              backgroundColor:
                theme.colors.surface,
            },
          ]}
        >
          <AppText
            variant="body"
            style={{
              color: dob
                ? theme.colors.onSurface
                : theme.colors
                    .onSurfaceVariant,
            }}
          >
            {dob
              ? formatDate(dob)
              : t(
                  Translations.ONBOARDING_DOB_LABEL,
                )}
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

        {showPicker && (
          <DateTimePicker
            value={dob ?? maxDate}
            mode="date"
            display="spinner"
            maximumDate={maxDate}
            onChange={onDateChange}
          />
        )}

        <View style={styles.bottomSection}>
          <Button
            mode="contained"
            onPress={onNext}
            disabled={!isValid}
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

export default NameAgeScreen;

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
  dobButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical:
      Spacing.SPACING_PADDING_16,
    paddingHorizontal:
      Spacing.SPACING_PADDING_16,
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
