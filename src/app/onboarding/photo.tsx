import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, Image, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import Spacer from '@shared/components/Spacer';
import OnboardingProgress from '@shared/components/OnboardingProgress';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';

const PHOTO_SIZE = 200;

const PhotoScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data, update } = useOnboardingData();

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      update({
        photoUri: result.assets[0].uri,
      });
    }
  }, [update]);

  const onNext = () => {
    router.push('/onboarding/interests');
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
          step={3}
          totalSteps={4}
          title={t(Translations.ONBOARDING_STEP_3_TITLE)}
        />

        <Spacer spacing={Spacing.SPACING_PADDING_8} />

        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {t(Translations.ONBOARDING_STEP_3_SUBTITLE)}
        </AppText>

        <Spacer spacing={Spacing.SPACING_PADDING_32} />

        <View style={styles.photoContainer}>
          {data.photoUri ? (
            <Image
              source={{
                uri: data.photoUri,
              }}
              style={styles.photoPreview}
            />
          ) : (
            <Pressable
              onPress={pickImage}
              accessibilityRole="button"
              accessibilityLabel={t(Common.A11Y_ADD_PHOTO)}
              style={[
                styles.uploadArea,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="camera-plus-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Spacer spacing={Spacing.SPACING_PADDING_8} />
              <AppText
                variant="body"
                style={{
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                {t(Translations.ONBOARDING_UPLOAD_PHOTO)}
              </AppText>
            </Pressable>
          )}
        </View>

        {data.photoUri ? (
          <>
            <Spacer spacing={Spacing.SPACING_PADDING_16} />
            <AppButton variant="link" onPress={pickImage}>
              {t(Translations.ONBOARDING_CHANGE_PHOTO)}
            </AppButton>
          </>
        ) : null}

        <View style={styles.bottomSection}>
          <AppButton
            variant="primary"
            onPress={onNext}
            disabled={!data.photoUri}
          >
            {t(Translations.ONBOARDING_NEXT)}
          </AppButton>
        </View>
      </ScrollView>
    </View>
  );
};

export default PhotoScreen;

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
  photoContainer: {
    alignItems: 'center',
  },
  uploadArea: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: Spacing.SPACING_PADDING_32,
  },
});
