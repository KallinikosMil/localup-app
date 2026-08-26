import React, { useCallback } from 'react';
import { StyleSheet, View, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from '@shared/components/AppText';
import OnboardingShell from '@features/onboarding/components/OnboardingShell';
import { useOnboardingData } from '@features/onboarding/context/OnboardingContext';
import { Translations } from '@features/onboarding/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';

// A card, not a circle. This step now teaches the model the rest of the
// app uses: photos are a PORTRAIT card you swipe, and there are six slots
// of them. The five ghost slots underneath say the second part without
// asking for anything yet — the old circular avatar taught the opposite
// and then Edit profile contradicted it.
const SLOT_W = 238;
const SLOT_H = 302;
const GHOST = 42;
const GHOST_COUNT = 5;

const PhotoScreen = () => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { data, update } = useOnboardingData();

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      // 3:4 rather than square: the card this feeds is a portrait hero,
      // and cropping to a circle here only to letterbox it there is how
      // people end up with their heads cut off in the deck.
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      update({
        photoUri: result.assets[0].uri,
      });
    }
  }, [update]);

  return (
    <OnboardingShell
      step={3}
      totalSteps={4}
      title={t(Translations.ONBOARDING_STEP_3_TITLE)}
      subtitle={t(Translations.ONBOARDING_STEP_3_SUBTITLE)}
      actionLabel={t(Translations.ONBOARDING_NEXT)}
      onAction={() => router.push('/onboarding/interests')}
      actionDisabled={!data.photoUri}
    >
      <View style={styles.slotRow}>
        <Pressable
          onPress={pickImage}
          accessibilityRole="button"
          accessibilityLabel={t(
            data.photoUri ? Common.A11Y_CHANGE_PHOTO : Common.A11Y_ADD_PHOTO,
          )}
          style={[
            styles.slot,
            data.photoUri
              ? null
              : {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.outlineDashed,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                },
          ]}
        >
          {data.photoUri ? (
            <Image
              source={{
                uri: data.photoUri,
              }}
              style={styles.preview}
            />
          ) : (
            <>
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.plus}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={28}
                  color={theme.colors.onGradient}
                />
              </LinearGradient>
              <AppText
                variant="buttonLg"
                style={{
                  color: theme.colors.onSurface,
                }}
              >
                {t(Translations.ONBOARDING_UPLOAD_PHOTO)}
              </AppText>
              <AppText
                variant="caption"
                style={{
                  color: theme.colors.onSurfaceFaint,
                }}
              >
                {t(Translations.ONBOARDING_PHOTO_SOURCE)}
              </AppText>
            </>
          )}
        </Pressable>
      </View>

      {/* Not interactive, and deliberately so: they are a picture of what
          the profile will hold, not five more things to do before you can
          get in. */}
      <View style={styles.ghostRow} pointerEvents="none">
        {Array.from({ length: GHOST_COUNT }, (_, i) => (
          <View
            key={i}
            style={[
              styles.ghost,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.outlineDashed,
              },
            ]}
          />
        ))}
      </View>

      <AppText
        variant="caption"
        style={[
          styles.ghostNote,
          {
            color: theme.colors.onSurfaceFaint,
          },
        ]}
      >
        {t(Translations.ONBOARDING_PHOTO_MORE_LATER)}
      </AppText>

      {data.photoUri ? (
        <AppText
          variant="labelStrong"
          onPress={pickImage}
          accessibilityRole="button"
          style={[
            styles.change,
            {
              color: theme.colors.primary,
            },
          ]}
        >
          {t(Translations.ONBOARDING_CHANGE_PHOTO)}
        </AppText>
      ) : null}
    </OnboardingShell>
  );
};

export default PhotoScreen;

const styles = StyleSheet.create({
  slotRow: {
    alignItems: 'center',
  },
  slot: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.STRIP_GAP,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  plus: {
    width: Layout.AVATAR_STRIP,
    height: Layout.AVATAR_STRIP,
    borderRadius: Layout.AVATAR_STRIP / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm + 1,
  },
  ghost: {
    width: GHOST,
    height: GHOST,
    borderRadius: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  ghostNote: {
    textAlign: 'center',
  },
  change: {
    textAlign: 'center',
  },
});
