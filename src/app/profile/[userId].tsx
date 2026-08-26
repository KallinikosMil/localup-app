import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { ActivityIndicator, Chip, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import CircleIconButton from '@shared/components/CircleIconButton';
import Spacer from '@shared/components/Spacer';
import CustomModal from '@shared/components/CustomModal';
import AppButton from '@shared/components/AppButton';
import useModal from '@shared/hooks/useModal';
import useLocation from '@shared/hooks/useLocation';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { useUserProfile, usePhotos } from '@features/profile/hooks/useProfile';
import { computeMode } from '@features/profile/utils/mode';
import { useUnmatch } from '@features/matches/hooks/useUnmatch';
import { useBlockUser } from '@features/matches/hooks/useBlockUser';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { useAppTheme, AppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';

// Read-only view of a MATCH's profile. Deliberately a separate screen from
// the (tabs)/profile one: that screen is "you" and is editable, this one is
// "them" and can only be left or unmatched. Sharing a component would mean
// one conditional per section and an easy way to render the wrong person's
// data as your own.
//
// Photos come from the same usePhotos hook, but the database decides what
// it returns: `media` is owner-only PLUS an active-match policy, so if the
// match ends the gallery stops resolving — no client-side check to forget.
export default function UserProfileScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { userId, matchId, name } = useLocalSearchParams<{
    userId: string;
    matchId?: string;
    name?: string;
  }>();

  const { data: profile, isPending, isError, error } = useUserProfile(userId);
  const { data: photos } = usePhotos(userId);
  const { latitude, longitude } = useLocation();
  const unmatch = useUnmatch();

  const block = useBlockUser();
  // Which destructive action the confirmation is asking about. One modal,
  // two questions — two modals with near-identical bodies is how you end
  // up shipping the wrong copy on one of them.
  const [pendingAction, setPendingAction] = useState<'unmatch' | 'block'>(
    'unmatch',
  );
  const { modalProps, openModal, closeModal } = useModal();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Which photo is open full-screen; null = none. Holding the URL rather
  // than an index means the viewer can't point at a stale slot if the
  // list refetches underneath it.
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const mode = computeMode(
    profile,
    profile?.current_lat ?? latitude,
    profile?.current_lng ?? longitude,
  );
  const modeLabel =
    mode === 'traveler'
      ? Translations.PROFILE_BADGE_TRAVELER
      : mode === 'local'
        ? Translations.PROFILE_BADGE_LOCAL
        : Translations.PROFILE_BADGE_LOCATING;
  const modeIcon =
    mode === 'traveler'
      ? 'airplane'
      : mode === 'local'
        ? 'home-variant-outline'
        : 'map-marker-question-outline';

  const confirmBlock = () => {
    if (!userId) return;
    closeModal();
    block.mutate(userId, {
      onSuccess: () => router.replace('/(tabs)/matches'),
      onError: err =>
        setErrorMsg(errorMessage(err, Translations.PROFILE_VIEW_BLOCK_ERROR)),
    });
  };

  const confirmUnmatch = () => {
    if (!matchId) return;
    closeModal();
    unmatch.mutate(matchId, {
      // Back twice: this screen AND the chat it was opened from both refer
      // to a match that no longer exists. Landing the user back on a chat
      // whose match is gone is the kind of dead end that looks like a bug.
      onSuccess: () => router.replace('/(tabs)/matches'),
      onError: err =>
        setErrorMsg(errorMessage(err, Translations.PROFILE_VIEW_UNMATCH_ERROR)),
    });
  };

  if (isPending) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator animating size="large" />
      </View>
    );
  }

  if (isError && !profile) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
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
          {errorMessage(error, Translations.PROFILE_ERROR)}
        </AppText>
        <Spacer spacing={Spacing.SPACING_PADDING_16} />
        <AppButton variant="link" onPress={() => router.back()}>
          {t(Translations.PROFILE_EDIT_BACK)}
        </AppButton>
      </View>
    );
  }

  const displayName =
    profile?.display_name ?? name ?? t(Translations.PROFILE_NO_NAME);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        {/* Same hero language as your own profile, so a profile reads the
            same whoever it belongs to. */}
        <View style={styles.hero}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.heroImage}
            />
          ) : (
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              style={[styles.heroImage, styles.heroFallback]}
            >
              <MaterialCommunityIcons
                name="account"
                size={96}
                color={theme.colors.ON_PHOTO}
                style={{ opacity: 0.9 }}
              />
            </LinearGradient>
          )}

          <LinearGradient
            colors={[
              'transparent',
              theme.colors.BLACK_A35,
              theme.colors.BLACK_A75,
            ]}
            style={styles.heroScrim}
          />

          <CircleIconButton
            size={36}
            onPress={() => router.back()}
            accessibilityLabel={t(Common.A11Y_BACK)}
            style={[
              styles.backPill,
              { backgroundColor: theme.colors.BLACK_A35, top: insets.top + 8 },
            ]}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={theme.colors.ON_PHOTO}
            />
          </CircleIconButton>

          <View style={styles.heroInfo}>
            <AppText variant="h1" style={{ color: theme.colors.ON_PHOTO }}>
              {displayName}
            </AppText>
            <View style={styles.heroMeta}>
              {profile?.home_city ? (
                <View style={styles.cityRow}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={14}
                    color={theme.colors.ON_PHOTO}
                  />
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors.ON_PHOTO, marginLeft: 4 }}
                  >
                    {profile.home_city}
                  </AppText>
                </View>
              ) : null}
              <View
                style={[
                  styles.modeBadge,
                  {
                    backgroundColor:
                      mode === 'traveler'
                        ? theme.colors.modeTraveler
                        : mode === 'local'
                          ? theme.colors.modeLocal
                          : theme.colors.BLACK_A35,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={modeIcon}
                  size={13}
                  color={theme.colors.ON_PHOTO}
                />
                <AppText
                  variant="caption"
                  style={{
                    color: theme.colors.ON_PHOTO,
                    fontWeight: '700',
                    marginLeft: 6,
                    letterSpacing: 0.5,
                  }}
                >
                  {t(modeLabel)}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Section title={t(Translations.PROFILE_SECTION_ABOUT)} theme={theme}>
            <AppText
              variant="body"
              style={{ color: theme.colors.onSurface, lineHeight: 22 }}
            >
              {profile?.bio?.trim() || t(Translations.PROFILE_BIO_EMPTY)}
            </AppText>
          </Section>

          <Spacer spacing={Spacing.SPACING_PADDING_16} />

          {/* Photos read the way they do on Tinder/Bumble: full width, one
              under the other, at a portrait ratio — not a grid of stamps.
              A face is the whole point of the screen, so it gets the whole
              column. Each one opens full-screen. */}
          {photos && photos.length > 0 ? (
            <View>
              {photos.map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => setViewerUrl(p.url)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t(Common.A11Y_PHOTO_OF_TOTAL, {
                    index: i + 1,
                    total: photos?.length ?? 0,
                  })}
                  style={styles.photoFull}
                >
                  <Image source={{ uri: p.url }} style={styles.photoImg} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Section
              title={t(Translations.PROFILE_SECTION_GALLERY)}
              theme={theme}
            >
              <AppText
                variant="body"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t(Translations.PROFILE_VIEW_NO_PHOTOS)}
              </AppText>
            </Section>
          )}

          {profile?.interests && profile.interests.length > 0 ? (
            <>
              <Spacer spacing={Spacing.SPACING_PADDING_16} />
              <Section
                title={t(Translations.PROFILE_SECTION_INTERESTS)}
                theme={theme}
              >
                <View style={styles.chips}>
                  {profile.interests.map(interest => (
                    <Chip
                      key={interest}
                      style={[
                        styles.chip,
                        { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                      textStyle={{ color: theme.colors.onSurface }}
                    >
                      {interest}
                    </Chip>
                  ))}
                </View>
              </Section>
            </>
          ) : null}

          <Spacer spacing={Spacing.SPACING_PADDING_32} />

          {/* Only offered when we know WHICH match to end. Reaching this
              screen without a matchId (a deep link, say) still shows the
              profile — it just cannot unmatch. */}
          {matchId ? (
            <Pressable
              onPress={() => {
                setPendingAction('unmatch');
                openModal();
              }}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_VIEW_UNMATCH)}
              accessibilityState={{
                disabled: unmatch.isPending || block.isPending,
              }}
              hitSlop={8}
              disabled={unmatch.isPending || block.isPending}
              style={styles.destructive}
            >
              {unmatch.isPending ? (
                <ActivityIndicator size={16} />
              ) : (
                <MaterialCommunityIcons
                  name="account-remove-outline"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
              )}
              <AppText
                variant="body"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontWeight: '600',
                  marginLeft: 6,
                }}
              >
                {t(Translations.PROFILE_VIEW_UNMATCH)}
              </AppText>
            </Pressable>
          ) : null}

          {/* Block does not need a match — you may want it for someone you
              only met in the deck. Rendered in the error tone while
              unmatch is neutral, because they are not equivalent: unmatch
              is reversible by matching again, a block is not. */}
          <Pressable
            onPress={() => {
              setPendingAction('block');
              openModal();
            }}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.PROFILE_VIEW_BLOCK)}
            accessibilityState={{
              disabled: unmatch.isPending || block.isPending,
            }}
            hitSlop={8}
            disabled={unmatch.isPending || block.isPending}
            style={styles.destructive}
          >
            {block.isPending ? (
              <ActivityIndicator size={16} />
            ) : (
              <MaterialCommunityIcons
                name="block-helper"
                size={16}
                color={theme.colors.error}
              />
            )}
            <AppText
              variant="body"
              style={{
                color: theme.colors.error,
                fontWeight: '600',
                marginLeft: 6,
              }}
            >
              {t(Translations.PROFILE_VIEW_BLOCK)}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>

      <CustomModal {...modalProps} onDismiss={closeModal}>
        <View style={styles.modalContent}>
          <AppText
            variant="h3"
            style={{ color: theme.colors.onSurface, textAlign: 'center' }}
          >
            {t(
              pendingAction === 'block'
                ? Translations.PROFILE_VIEW_BLOCK_TITLE
                : Translations.PROFILE_VIEW_UNMATCH_TITLE,
              { name: displayName },
            )}
          </AppText>
          <Spacer spacing={Spacing.SPACING_PADDING_8} />
          <AppText
            variant="body"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
            }}
          >
            {t(
              pendingAction === 'block'
                ? Translations.PROFILE_VIEW_BLOCK_BODY
                : Translations.PROFILE_VIEW_UNMATCH_BODY,
            )}
          </AppText>
          <Spacer spacing={Spacing.SPACING_PADDING_16} />
          <AppButton
            variant="primary"
            buttonColor={theme.colors.error}
            onPress={pendingAction === 'block' ? confirmBlock : confirmUnmatch}
          >
            {t(
              pendingAction === 'block'
                ? Translations.PROFILE_VIEW_BLOCK_CONFIRM
                : Translations.PROFILE_VIEW_UNMATCH_CONFIRM,
            )}
          </AppButton>
          <Spacer spacing={Spacing.SPACING_PADDING_8} />
          <AppButton variant="link" onPress={closeModal}>
            {t(Translations.PROFILE_VIEW_UNMATCH_CANCEL)}
          </AppButton>
        </View>
      </CustomModal>

      {/* Full-screen photo. `resizeMode="contain"` on a black field, so a
          portrait shot is never cropped to fit the viewport — the point of
          opening it is to see all of it. Tap anywhere to close. */}
      <Modal
        visible={!!viewerUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUrl(null)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.viewer}
          accessibilityRole="button"
          accessibilityLabel={t(Common.A11Y_CLOSE)}
          onPress={() => setViewerUrl(null)}
        >
          {viewerUrl ? (
            <Image
              source={{ uri: viewerUrl }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            onPress={() => setViewerUrl(null)}
            accessibilityRole="button"
            accessibilityLabel={t(Common.A11Y_CLOSE)}
            hitSlop={12}
            style={[styles.viewerClose, { top: insets.top + 8 }]}
          >
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={theme.colors.ON_PHOTO}
            />
          </Pressable>
        </Pressable>
      </Modal>

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

const Section = ({
  title,
  theme,
  children,
}: {
  title: string;
  theme: AppTheme;
  children: React.ReactNode;
}) => (
  <View>
    <AppText
      variant="caption"
      style={{
        color: theme.colors.onSurfaceVariant,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        fontSize: 11,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '600',
      }}
    >
      {title}
    </AppText>
    <View
      style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}
    >
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
  content: { paddingBottom: Spacing.SPACING_PADDING_32 },
  hero: {
    height: 460,
    width: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  backPill: {
    position: 'absolute',
    left: Spacing.SPACING_PADDING_16,
  },
  heroInfo: {
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingBottom: Spacing.SPACING_PADDING_24,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.SPACING_PADDING_8,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center' },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  body: {
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingTop: Spacing.SPACING_PADDING_24,
  },
  sectionCard: {
    padding: Spacing.SPACING_PADDING_16,
    borderRadius: BorderRadius.xxl,
  },
  photoFull: {
    width: '100%',
    // Portrait, like every dating app: a person is taller than they are
    // wide, and a 1:1 crop cuts heads off.
    aspectRatio: 4 / 5,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    marginBottom: Spacing.SPACING_PADDING_12,
  },
  photoImg: { width: '100%', height: '100%' },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '100%' },
  viewerClose: {
    position: 'absolute',
    right: Spacing.SPACING_PADDING_16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: BorderRadius.pill },
  destructive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.SPACING_PADDING_12,
  },
  modalContent: { alignItems: 'center', width: '100%' },
});
