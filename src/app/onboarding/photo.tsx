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

// A card, not a circle. This step teaches the model the rest of the app
// uses: photos are a PORTRAIT card you swipe, and there are six slots of
// them. The old circular avatar taught the opposite and then Edit profile
// contradicted it.
//
// The five small slots used to be decoration — a picture of what the
// profile would hold. They are real now. One photo is still all that is
// required to finish, but someone who wants to add four while they are
// already here should not have to finish onboarding first and then go
// find Edit profile to do it.
const MAX_PHOTOS = 6;
const EXTRA_SLOTS = MAX_PHOTOS - 1;

const PhotoScreen = () => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { data, update } = useOnboardingData();

  const photos = data.photoUris;

  // `index` is the position being filled. Past the end it appends, so one
  // handler serves "add the first", "add a fourth" and "replace the
  // second" without the caller knowing which it is.
  const pickImage = useCallback(
    async (index: number) => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        // 3:4 rather than square: the card this feeds is a portrait hero,
        // and cropping to a circle here only to letterbox it there is how
        // people end up with their heads cut off in the deck.
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) return;
      const uri = result.assets[0].uri;

      const next = [...photos];
      if (index < next.length) {
        next[index] = uri;
      } else {
        next.push(uri);
      }
      update({ photoUris: next.slice(0, MAX_PHOTOS) });
    },
    [photos, update],
  );

  // Removing the first photo promotes the second rather than leaving a
  // hole: the avatar is whichever one is first, the same rule the deck
  // and the profile hero already follow.
  const removeAt = useCallback(
    (index: number) => {
      update({ photoUris: photos.filter((_, i) => i !== index) });
    },
    [photos, update],
  );

  const first = photos[0];

  return (
    <OnboardingShell
      step={3}
      totalSteps={4}
      title={t(Translations.ONBOARDING_STEP_3_TITLE)}
      subtitle={t(Translations.ONBOARDING_STEP_3_SUBTITLE)}
      actionLabel={t(Translations.ONBOARDING_NEXT)}
      onAction={() => router.push('/onboarding/interests')}
      actionDisabled={photos.length === 0}
    >
      <View style={styles.slotRow}>
        <Pressable
          onPress={() => pickImage(0)}
          onLongPress={first ? () => removeAt(0) : undefined}
          accessibilityRole="button"
          accessibilityLabel={t(
            first ? Common.A11Y_CHANGE_PHOTO : Common.A11Y_ADD_PHOTO,
          )}
          accessibilityHint={
            first ? t(Common.A11Y_REMOVE_PHOTO_HINT) : undefined
          }
          // The background is unconditional so the card has something to
          // show while the photo decodes, instead of a hole. The dashes
          // stay conditional — a photo covers the fill anyway.
          style={[
            styles.slot,
            { backgroundColor: theme.colors.surfaceElevated },
            first
              ? null
              : {
                  borderColor: theme.colors.outlineDashed,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                },
          ]}
        >
          {first ? (
            <Image source={{ uri: first }} style={styles.previewLg} />
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

      <View style={styles.extraRow}>
        {Array.from({ length: EXTRA_SLOTS }, (_, i) => {
          // Slot i in this row is photo i + 1; the big card above is 0.
          const index = i + 1;
          const uri = photos[index];
          // Only one empty slot is ever reachable, and it is the next one
          // in line. Otherwise tapping the last slot with two filled
          // would leave a hole in the middle of an ordered list.
          const isNext = index === photos.length;
          const disabled = !uri && !isNext;
          return (
            <Pressable
              key={index}
              onPress={disabled ? undefined : () => pickImage(index)}
              onLongPress={uri ? () => removeAt(index) : undefined}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t(
                uri ? Common.A11Y_CHANGE_PHOTO : Common.A11Y_ADD_PHOTO,
              )}
              accessibilityHint={
                uri ? t(Common.A11Y_REMOVE_PHOTO_HINT) : undefined
              }
              accessibilityState={{ disabled }}
              style={[
                styles.extra,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: isNext
                    ? theme.colors.outlineSelected
                    : theme.colors.outlineDashed,
                },
                uri ? styles.extraFilled : null,
              ]}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.preview} />
              ) : isNext ? (
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color={theme.colors.onSurfaceFaint}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <AppText
        variant="caption"
        style={[
          styles.note,
          {
            color: theme.colors.onSurfaceFaint,
          },
        ]}
      >
        {t(Translations.ONBOARDING_PHOTO_MORE_LATER)}
      </AppText>

      {/* A Pressable, not an AppText with onPress. Text takes its
          height from the type — about 18pt here — so the tappable area
          was less than half the 44pt floor, on the one control that
          undoes a mistake. */}
      {first ? (
        <Pressable
          onPress={() => pickImage(0)}
          accessibilityRole="button"
          accessibilityLabel={t(Translations.ONBOARDING_CHANGE_PHOTO)}
          style={styles.change}
        >
          <AppText
            variant="labelStrong"
            style={{
              color: theme.colors.primary,
            }}
          >
            {t(Translations.ONBOARDING_CHANGE_PHOTO)}
          </AppText>
        </Pressable>
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
    width: Layout.PHOTO_SLOT_LG_W,
    height: Layout.PHOTO_SLOT_LG_H,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.STRIP_GAP,
    // No overflow:'hidden'. With a rounded corner and no border, this view
    // sits on a HARDWARE layer, and the rounded clip there does not draw a
    // child that fills the bounds — the photo loaded (onLoad fired) and
    // simply never appeared. The five small slots escape it only because
    // their dashed border forces a software layer, and so does this card's
    // own empty state, which is why the gradient and labels always drew.
    // The image rounds itself (previewLg), so nothing needs clipping.
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  // The large card rounds the IMAGE itself rather than leaning on the
  // parent's overflow:'hidden'. A child whose bounds coincide exactly
  // with a rounded clip gets clipped away entirely on Android; the small
  // slots escape it only because their 1px border insets the child by a
  // pixel. Rounding here means nothing has to be clipped at all.
  // The card rounds the IMAGE rather than clipping it with the parent —
  // see the note on `slot` for why the parent cannot do it. Explicit
  // pixels because the slot is a fixed size and there is no longer a
  // clipping parent for a percentage to resolve against.
  previewLg: {
    width: Layout.PHOTO_SLOT_LG_W,
    height: Layout.PHOTO_SLOT_LG_H,
    borderRadius: BorderRadius.xxl,
  },
  plus: {
    width: Layout.AVATAR_STRIP,
    height: Layout.AVATAR_STRIP,
    borderRadius: Layout.AVATAR_STRIP / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.PHOTO_SLOT_GAP,
  },
  extra: {
    width: Layout.PHOTO_SLOT_SM,
    height: Layout.PHOTO_SLOT_SM,
    borderRadius: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  extraFilled: {
    // A photo fills the slot, so the dashes that meant "empty" would just
    // be a border drawn on top of it.
    borderStyle: 'solid',
  },
  note: {
    textAlign: 'center',
  },
  change: {
    minHeight: Layout.TOUCH_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
