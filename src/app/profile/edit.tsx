import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

import AppText from '@shared/components/AppText';
import ScreenSafeArea from '@shared/components/ScreenSafeArea';
import Spacer from '@shared/components/Spacer';
import RetryButton from '@shared/components/RetryButton';
import useLocation from '@shared/hooks/useLocation';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import {
  useProfile,
  useUpdateProfile,
  usePhotos,
  useUploadPhoto,
  useDeletePhoto,
  useReorderPhotos,
  type Photo,
} from '@features/profile/hooks/useProfile';
import { computeMode, type ProfileMode } from '@features/profile/utils/mode';
import PhotoGrid from '@features/profile/components/PhotoGrid';
import { useAppTheme } from '@theme/paper';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';
import {
  Section,
  SectionRule,
  LabelledField,
  ModeSegments,
} from '@features/profile/components/EditField';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';
import { BorderRadius } from '@theme/constants/BorderRadius';

const MAX_PHOTOS = 6;
const BIO_LIMIT = 240;

function EditProfileScreenContent() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const {
    data: profile,
    // isPending, not isLoading — true while the query is still
    // disabled (no uid yet), so we never fall through to the form
    // with an undefined profile.
    isPending,
    error,
    refetch,
  } = useProfile();
  const { data: photos, isError: photosError } = usePhotos(profile?.user_id);
  const updateProfile = useUpdateProfile();
  const uploadPhoto = useUploadPhoto();
  const deletePhoto = useDeletePhoto();
  const reorderPhotos = useReorderPhotos();
  const { latitude, longitude } = useLocation();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [dirty, setDirty] = useState(false);

  // H2: every mutation on this screen used to fail SILENTLY — no
  // onError anywhere, so a failed save just un-spun the button and a
  // failed photo upload/delete did nothing at all. One Snackbar,
  // shared by all five.
  //
  // V10: and each of them said "— check your connection", which is a
  // guess. `errorMessage` reads the error's structured fields and picks
  // the offline sentence only when the request genuinely never landed.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // V14 — THE FLICKER.
  //
  // This effect used to run on every new `profile` OBJECT, not on every
  // new profile. React Query hands back a fresh object on each refetch
  // and on every `setQueryData` — and `useSyncLocation` patches
  // ['profile', uid] from the still-mounted tabs underneath this screen
  // whenever a GPS fix lands. So the effect re-fired mid-edit and
  // BLEW AWAY the three inputs, resetting them to the server's values in
  // front of the user. That's the visible flicker: the fields snap back.
  //
  // Hydrate once per user instead. The form is the source of truth from
  // the first render on; a background refetch may not reach in and
  // rewrite what the user is typing.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || hydratedFor.current === profile.user_id) return;
    hydratedFor.current = profile.user_id;
    setName(profile.display_name ?? '');
    setCity(profile.home_city ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  // null === "we can't tell yet" — see computeMode. The note under the
  // mode pills gets its own sentence for that case instead of asserting
  // "Local".
  const mode = computeMode(
    profile,
    profile?.current_lat ?? latitude,
    profile?.current_lng ?? longitude,
  );
  const modeLabel =
    mode === 'traveler'
      ? t(Translations.PROFILE_MODE_TRAVELER)
      : t(Translations.PROFILE_MODE_LOCAL);

  const handleSave = () => {
    updateProfile.mutate(
      {
        display_name: name.trim(),
        home_city: city.trim(),
        bio: bio.trim(),
      },
      {
        onSuccess: () => router.back(),
        onError: err =>
          setErrorMsg(errorMessage(err, Translations.PROFILE_SAVE_ERROR)),
      },
    );
  };

  const handleCancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(
      t(Translations.PROFILE_DISCARD_TITLE),
      t(Translations.PROFILE_DISCARD_BODY),
      [
        {
          text: t(Translations.PROFILE_DISCARD_KEEP),
          style: 'cancel',
        },
        {
          text: t(Translations.PROFILE_DISCARD_CONFIRM),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    );
  };

  const markDirty = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  const setMode = (next: ProfileMode | null) => {
    updateProfile.mutate(
      {
        mode_override: next,
      },
      {
        onError: err =>
          setErrorMsg(errorMessage(err, Translations.PROFILE_SAVE_ERROR)),
      },
    );
  };

  const setHomeHere = () => {
    if (latitude == null || longitude == null) {
      Alert.alert(
        t(Translations.PROFILE_LOCATION_UNAVAILABLE_TITLE),
        t(Translations.PROFILE_LOCATION_UNAVAILABLE_BODY),
      );
      return;
    }
    updateProfile.mutate(
      {
        home_lat: latitude,
        home_lng: longitude,
      },
      {
        onError: err =>
          setErrorMsg(errorMessage(err, Translations.PROFILE_SAVE_ERROR)),
      },
    );
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t(Translations.PROFILE_PHOTO_PERMISSION_TITLE),
        t(Translations.PROFILE_PHOTO_PERMISSION_BODY),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    uploadPhoto.mutate(
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      },
      {
        onError: err =>
          setErrorMsg(
            errorMessage(err, Translations.PROFILE_PHOTO_UPLOAD_ERROR),
          ),
      },
    );
  };

  const confirmDelete = (id: string) => {
    if ((photos ?? []).length <= 1) {
      Alert.alert(
        t(Translations.PROFILE_PHOTO_LAST_TITLE),
        t(Translations.PROFILE_PHOTO_LAST_BODY),
      );
      return;
    }
    Alert.alert(
      t(Translations.PROFILE_PHOTO_DELETE_TITLE),
      t(Translations.PROFILE_PHOTO_DELETE_BODY),
      [
        {
          text: t(Translations.PROFILE_CANCEL),
          style: 'cancel',
        },
        {
          text: t(Translations.PROFILE_PHOTO_DELETE_CONFIRM),
          style: 'destructive',
          onPress: () =>
            deletePhoto.mutate(id, {
              onError: err =>
                setErrorMsg(
                  errorMessage(err, Translations.PROFILE_PHOTO_DELETE_ERROR),
                ),
            }),
        },
      ],
    );
  };

  const photoCount = photos?.length ?? 0;

  // H2: both of these branches used to be one `if (isLoading ||
  // !profile)` that rendered a bare spinner with NO app bar and NO
  // Cancel — on an error (profile stays undefined) the user was
  // trapped on a permanent spinner with no way back and nothing to
  // retry. Every non-form state now keeps a back affordance.
  const backBar = (
    <View
      style={[
        styles.appBar,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.surfaceVariant,
        },
      ]}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t(Common.A11Y_BACK)}
        hitSlop={12}
        style={[
          styles.pillGhost,
          {
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurface,
            fontWeight: '500',
          }}
        >
          {t(Translations.PROFILE_EDIT_BACK)}
        </AppText>
      </Pressable>
    </View>
  );

  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        {backBar}
        <View style={styles.center}>
          <ActivityIndicator animating size="large" />
        </View>
      </View>
    );
  }

  // V14, second half. This was `isError || !profile` — so a FAILED
  // BACKGROUND REFETCH (the profile query is shared with the tabs
  // underneath and gets invalidated by useSyncLocation) tore the form
  // off the screen and replaced it with the error state, even though RQ
  // still held the cached profile that the form was rendering from
  // perfectly well a frame earlier. Then the next successful fetch put
  // it back. Branch-swap, and with it the user's unsaved edits, gone.
  //
  // The only state we genuinely cannot render a form for is "no profile
  // at all". Gate on exactly that (same shape as Discover's
  // `isError && !current`) and let a stale-but-usable profile keep the
  // screen; the Snackbar already reports write failures.
  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        {backBar}
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={40}
            color={theme.colors.onSurfaceVariant}
          />
          <AppText
            variant="body"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginTop: Spacing.SPACING_PADDING_12,
            }}
          >
            {errorMessage(error, Translations.PROFILE_EDIT_ERROR)}
          </AppText>
          <RetryButton
            label={t(Translations.PROFILE_RETRY)}
            onPress={() => refetch()}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Glass-style top bar */}
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <Pressable
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel={t(Translations.PROFILE_CANCEL)}
          hitSlop={12}
          style={[
            styles.pillGhost,
            {
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
        >
          <AppText
            variant="body"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '500',
            }}
          >
            {t(Translations.PROFILE_CANCEL)}
          </AppText>
        </Pressable>

        <AppText
          variant="h3"
          style={{
            color: theme.colors.onBackground,
          }}
        >
          {t(Translations.PROFILE_EDIT_TITLE)}
        </AppText>

        {/* V14, third half. This used to swap the LABEL — "Save" →
            "Saving…" → "Save" — and the label is what sizes the pill,
            which is the last item in a space-between row. An offline
            save fails in tens of milliseconds, so the app bar reflowed
            out and straight back: a flick, right before the Snackbar.
            (A minWidth wouldn't fix it — in Greek both labels are wider
            than any floor we'd pick.) The label now never changes; the
            spinner sits ON it, so the pending state costs zero layout in
            every language. */}
        <Pressable
          onPress={handleSave}
          disabled={updateProfile.isPending}
          hitSlop={12}
          accessibilityRole="button"
          // The label deliberately does not change (see the note above), so
          // the busy state has to be carried here instead.
          accessibilityState={{
            disabled: updateProfile.isPending,
            busy: updateProfile.isPending,
          }}
          accessibilityLabel={
            updateProfile.isPending
              ? t(Translations.PROFILE_SAVING)
              : t(Translations.PROFILE_SAVE)
          }
          style={[
            styles.pillPrimary,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <AppText
            variant="body"
            style={{
              color: theme.colors.onPrimary,
              fontWeight: '600',
              opacity: updateProfile.isPending ? 0 : 1,
            }}
          >
            {t(Translations.PROFILE_SAVE)}
          </AppText>
          {updateProfile.isPending ? (
            <View style={styles.pillSpinner} pointerEvents="none">
              <ActivityIndicator
                animating
                size="small"
                color={theme.colors.onPrimary}
              />
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* The circular avatar that used to sit here is gone. Photos ARE
            the grid below, and slot 1 IS the avatar — showing both raised
            the question of which one wins, which was exactly the
            confusion the position column was added to end.

            Photos come FIRST now. They are the thing people actually open
            this screen to change, and they were buried under two text
            fields. */}
        <Section
          title={t(Translations.PROFILE_SECTION_YOUR_GALLERY)}
          trailing={t(Translations.PROFILE_PHOTO_COUNT_OF, {
            count: photoCount,
            max: MAX_PHOTOS,
          })}
        >
          {/* A failed read must not present as "you have no photos" (the
              PR-H2 rule) — that invites the user to re-upload photos they
              already have. Only shown when the read failed AND nothing is
              cached; a stale-but-usable list still renders below. */}
          {photosError && !photos?.length ? (
            <AppText
              variant="body"
              style={[
                styles.photoNotice,
                {
                  color: theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {t(Translations.PROFILE_GALLERY_ERROR)}
            </AppText>
          ) : null}

          <AppText
            variant="caption"
            style={[
              styles.photoHint,
              {
                color: theme.colors.onSurfaceFaint,
              },
            ]}
          >
            {t(Translations.PROFILE_PHOTO_REORDER_HINT)}
          </AppText>

          <PhotoGrid
            photos={photos ?? []}
            maxSlots={MAX_PHOTOS}
            busy={uploadPhoto.isPending || reorderPhotos.isPending}
            onAdd={pickPhoto}
            onRemove={(photo: Photo) => confirmDelete(photo.id)}
            /* Onboarding treats one photo as mandatory in three separate
               places, and Edit let you drop below it — leaving a profile
               with nothing for the deck to show. Explained rather than
               silently disabled, so the button is not a dead control. */
            onReorder={(ids: string[]) =>
              reorderPhotos.mutate(ids, {
                onError: () =>
                  setErrorMsg(t(Translations.PROFILE_REORDER_ERROR)),
              })
            }
          />
        </Section>

        <SectionRule />

        <Section title={t(Translations.PROFILE_SECTION_BASICS)}>
          <View style={styles.fields}>
            <LabelledField
              label={t(Translations.PROFILE_NAME_PLACEHOLDER)}
              icon="account-outline"
              value={name}
              onChange={markDirty(setName)}
            />
            <LabelledField
              label={t(Translations.PROFILE_CITY_PLACEHOLDER)}
              icon="map-marker-outline"
              value={city}
              onChange={markDirty(setCity)}
            />
          </View>
        </Section>

        <SectionRule />

        {/* Home base is NOT in the artboards, and is kept anyway: it is
            the only way to set home COORDINATES, and without them the
            mode rule has nothing to compare against — you would sit at
            "we cannot tell" forever. The design shows a home city field,
            which is a label; this sets the position that label stands
            for. */}
        <Section title={t(Translations.PROFILE_SECTION_HOME_BASE)}>
          <View
            style={[
              styles.homeBase,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={Layout.FIELD_ICON}
              color={theme.colors.onSurfaceFaint}
            />
            <View style={styles.homeBaseText}>
              <AppText
                variant="bodySmallStrong"
                style={{
                  color: theme.colors.onSurface,
                }}
              >
                {profile.home_city ?? t(Translations.PROFILE_HOME_NOT_SET)}
              </AppText>
              <AppText
                variant="micro"
                style={{
                  color: theme.colors.onSurfaceFaint,
                }}
              >
                {profile.home_lat != null
                  ? `${profile.home_lat.toFixed(3)}, ${profile.home_lng?.toFixed(3)}`
                  : t(Translations.PROFILE_HOME_NO_COORDS)}
              </AppText>
            </View>
          </View>

          <Pressable
            onPress={setHomeHere}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.PROFILE_SET_HOME)}
            style={[
              styles.setHome,
              {
                borderColor: theme.colors.outlineSelected,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={16}
              color={theme.colors.primary}
            />
            <AppText
              variant="bodySmallStrong"
              style={{
                color: theme.colors.primary,
              }}
            >
              {t(Translations.PROFILE_SET_HOME)}
            </AppText>
          </Pressable>
        </Section>

        <SectionRule />

        <Section title={t(Translations.PROFILE_SECTION_ABOUT_YOU)}>
          <RNTextInput
            value={bio}
            onChangeText={markDirty(setBio)}
            maxLength={BIO_LIMIT}
            multiline
            placeholder={t(Translations.PROFILE_BIO_PLACEHOLDER)}
            placeholderTextColor={theme.colors.onSurfaceFaint}
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
          <AppText
            variant="micro"
            style={[
              styles.counter,
              {
                color: theme.colors.onSurfaceFaint,
              },
            ]}
          >
            {bio.length} / {BIO_LIMIT}
          </AppText>
        </Section>

        <SectionRule />

        <Section title={t(Translations.PROFILE_SECTION_MODE)}>
          <ModeSegments
            theme={theme}
            options={[
              {
                label: t(Translations.PROFILE_MODE_AUTO),
                active: profile.mode_override === null,
                onPress: () => setMode(null),
              },
              {
                label: t(Translations.PROFILE_MODE_LOCAL),
                active: profile.mode_override === 'local',
                onPress: () => setMode('local'),
              },
              {
                label: t(Translations.PROFILE_MODE_TRAVELER),
                active: profile.mode_override === 'traveler',
                onPress: () => setMode('traveler'),
              },
            ]}
          />

          {/* Three sentences, not a concatenation: the mode name is
              interpolated so translations can reorder it, and the unknown
              case gets its own honest line instead of asserting "Local"
              while we are still waiting for coordinates. */}
          <AppText
            variant="caption"
            style={[
              styles.modeNote,
              {
                color: theme.colors.onSurfaceFaint,
              },
            ]}
          >
            {mode === null
              ? t(Translations.PROFILE_MODE_NOTE_UNKNOWN)
              : profile.mode_override === null
                ? t(Translations.PROFILE_MODE_NOTE_AUTO, {
                    mode: modeLabel,
                  })
                : t(Translations.PROFILE_MODE_NOTE_MANUAL, {
                    mode: modeLabel,
                  })}
          </AppText>
        </Section>

        <Spacer spacing={Spacing.SPACING_PADDING_32} />
      </ScrollView>

      <Snackbar
        visible={!!errorMsg}
        onDismiss={() => setErrorMsg(null)}
        duration={4000}
      >
        {errorMsg ?? ''}
      </Snackbar>
    </View>
  );
}

// ─── helpers ─────────────────────────

// The group layout no longer insets this route — /profile/[userId] in
// the same group is a full-bleed hero and could not opt out of a parent
// inset. Edit is an ordinary form page and still wants one, so it takes
// it here, around all of its top-level returns at once.
export default function EditProfileScreen() {
  return (
    <ScreenSafeArea>
      <EditProfileScreenContent />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Layout.CHAT_HEADER_HEIGHT,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  pillGhost: {
    paddingHorizontal: Layout.PILL_PADDING_H,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
  pillPrimary: {
    height: Layout.ICON_BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderRadius: Layout.ICON_BUTTON / 2,
    overflow: 'hidden',
  },
  pillSpinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Layout.SCREEN_PADDING,
    paddingTop: Layout.SECTION_GAP,
    paddingBottom: Spacing.xxl,
  },
  photoNotice: {
    marginBottom: Spacing.sm,
  },
  photoHint: {
    marginBottom: Spacing.md,
  },
  fields: {
    gap: Layout.STRIP_GAP,
  },
  homeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
  },
  homeBaseText: {
    flex: 1,
  },
  setHome: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.CHIP_GAP,
    marginTop: Spacing.md,
    paddingHorizontal: Layout.PILL_PADDING_H,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  bioInput: {
    minHeight: Layout.FIELD_HEIGHT * 2,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    paddingTop: Layout.STRIP_GAP,
    paddingBottom: Layout.STRIP_GAP,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: Spacing.xs + 2,
  },
  modeNote: {
    marginTop: Spacing.sm,
  },
});
