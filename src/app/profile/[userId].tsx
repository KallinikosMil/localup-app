import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import CustomModal from '@shared/components/CustomModal';
import AppButton from '@shared/components/AppButton';
import YesMark from '@shared/components/YesMark';
import useModal from '@shared/hooks/useModal';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import ProfileHero from '@features/profile/components/ProfileHero';
import { useUserProfile, usePhotos } from '@features/profile/hooks/useProfile';
import { formatDistance } from '@features/discover/utils/format';
import { useUnmatch } from '@features/matches/hooks/useUnmatch';
import { useBlockUser } from '@features/matches/hooks/useBlockUser';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';

// Read-only view of a MATCH's profile. Deliberately a separate screen from
// the (tabs)/profile one: that screen is "you" and is editable, this one is
// "them" and can only be messaged, left or blocked. Sharing a component
// would mean one conditional per section and an easy way to render the
// wrong person's data as your own — the hero is shared, the screen is not.
//
// Photos come from the same usePhotos hook, and the DATABASE decides what
// it returns: `media` is owner-only plus an active-match policy, so when
// the match ends the photos stop resolving. No client-side check to
// forget.
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

  const displayName = profile?.display_name ?? name ?? '';
  const mode = profile?.profile_mode ?? null;
  const modeLabel = t(
    mode === 'traveler'
      ? Translations.PROFILE_BADGE_TRAVELER
      : mode === 'local'
        ? Translations.PROFILE_BADGE_LOCAL
        : Translations.PROFILE_BADGE_LOCATING,
  );

  const shared = new Set(profile?.shared_interest_names ?? []);

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
      // Back to the list, not back one screen: this screen AND the chat it
      // was opened from both refer to a match that no longer exists.
      // Landing on a chat whose match is gone is the kind of dead end that
      // looks like a bug.
      onSuccess: () => router.replace('/(tabs)/matches'),
      onError: err =>
        setErrorMsg(errorMessage(err, Translations.PROFILE_VIEW_UNMATCH_ERROR)),
    });
  };

  const busy = unmatch.isPending || block.isPending;

  if (isPending) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator animating size="large" />
      </View>
    );
  }

  // `!profile` covers two different things and both mean the same to the
  // reader: the read failed, or the RPC returned no row because the pair
  // is blocked. Neither should show a half-drawn profile.
  if (isError || !profile) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={40}
          color={theme.colors.onSurfaceVariant}
        />
        <AppText
          variant="body"
          style={[
            styles.centerNote,
            {
              color: theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {errorMessage(error, Translations.PROFILE_ERROR)}
        </AppText>
        <Spacer spacing={Spacing.lg} />
        <AppButton variant="link" onPress={() => router.back()}>
          {t(Translations.PROFILE_EDIT_BACK)}
        </AppButton>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {/* The hero runs under the status bar, so its icons are light here
          regardless of theme. Not gated on focus: unlike a tab, this
          screen unmounts when you leave it, and RN restores the previous
          bar style by itself. */}
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.content}>
        <ProfileHero
          photoUrls={(photos ?? []).map(p => p.url)}
          fallbackUrl={profile.avatar_url}
          displayName={displayName}
          age={profile.age}
          city={profile.home_city}
          mode={mode}
          modeLabel={modeLabel}
          distanceLabel={
            profile.distance_km != null
              ? formatDistance(profile.distance_km, t)
              : null
          }
          leftAction={
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t(Common.A11Y_BACK)}
              hitSlop={Layout.HIT_SLOP}
              style={[
                styles.roundOnPhoto,
                {
                  backgroundColor: theme.colors.headerPill,
                  borderColor: theme.colors.headerPillBorder,
                },
                theme.dark ? null : styles.onPhotoShadow,
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={theme.colors.onHeaderPill}
              />
            </Pressable>
          }
        />

        <View style={styles.body}>
          {/* The primary action on someone else's profile is to talk to
              them. Only offered when there is a match to talk inside —
              this screen is also reachable for someone you have only
              blocked or unmatched from another entry point. */}
          {matchId ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/chat/[matchId]',
                  params: {
                    matchId,
                    name: displayName,
                    userId: profile.user_id,
                    ...(profile.avatar_url
                      ? { avatar: profile.avatar_url }
                      : {}),
                  },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_VIEW_MESSAGE, {
                name: displayName,
              })}
              style={styles.messageButton}
            >
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.messageButtonFill}
              >
                <MaterialCommunityIcons
                  name="chat-outline"
                  size={19}
                  color={theme.colors.onGradient}
                />
                <AppText
                  variant="buttonLg"
                  style={{
                    color: theme.colors.onGradient,
                  }}
                >
                  {t(Translations.PROFILE_VIEW_MESSAGE, {
                    name: displayName,
                  })}
                </AppText>
              </LinearGradient>
            </Pressable>
          ) : null}

          {profile.bio?.trim() ? (
            <>
              <AppText
                variant="overline"
                style={[
                  styles.sectionLabel,
                  {
                    color: theme.colors.onSurfaceFaint,
                  },
                ]}
              >
                {t(Translations.PROFILE_SECTION_ABOUT)}
              </AppText>
              <AppText
                variant="bodyLg"
                style={[
                  styles.bio,
                  {
                    color: theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {profile.bio.trim()}
              </AppText>
            </>
          ) : null}

          {profile.interest_names.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <AppText
                  variant="overline"
                  style={{
                    color: theme.colors.onSurfaceFaint,
                  }}
                >
                  {t(Translations.PROFILE_SECTION_INTERESTS)}
                </AppText>
                {shared.size > 0 ? (
                  <AppText
                    variant="microStrong"
                    style={{
                      color: theme.colors.primary,
                    }}
                  >
                    {t(Translations.PROFILE_VIEW_IN_COMMON, {
                      count: shared.size,
                    })}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.chips}>
                {profile.interest_names.map(interest => {
                  const isShared = shared.has(interest);
                  return (
                    <View
                      key={interest}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isShared
                            ? theme.colors.surfaceSelected
                            : theme.colors.surfaceElevated,
                          borderColor: isShared
                            ? theme.colors.outlineSelected
                            : theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      {/* A tick, not just a tint: shared is the reason
                          these two were shown to each other, and colour
                          alone does not survive a colour-blind reader. */}
                      {isShared ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={12}
                          color={theme.colors.primary}
                        />
                      ) : null}
                      <AppText
                        variant={isShared ? 'microStrong' : 'micro'}
                        style={{
                          color: isShared
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        }}
                      >
                        {interest}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          <View style={styles.spacer} />

          {/* Both destructive, side by side, and neither is a primary
              button. Unmatch is neutral, Block wears the error tone —
              they are not equivalent: unmatch ends a conversation, block
              says never show me this person again. */}
          <View
            style={[
              styles.destructiveRow,
              {
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            {matchId ? (
              <Pressable
                onPress={() => {
                  setPendingAction('unmatch');
                  openModal();
                }}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t(Translations.PROFILE_VIEW_UNMATCH)}
                accessibilityState={{ disabled: busy }}
                style={[
                  styles.destructiveButton,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                {unmatch.isPending ? (
                  <ActivityIndicator size={16} />
                ) : (
                  <YesMark
                    size={19}
                    struck
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
                <AppText
                  variant="bodySmallStrong"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                  }}
                >
                  {t(Translations.PROFILE_VIEW_UNMATCH)}
                </AppText>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                setPendingAction('block');
                openModal();
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_VIEW_BLOCK)}
              accessibilityHint={t(Translations.PROFILE_VIEW_BLOCK_BODY)}
              accessibilityState={{ disabled: busy }}
              style={[
                styles.destructiveButton,
                {
                  backgroundColor: theme.colors.errorContainer,
                  borderColor: theme.colors.errorOutline,
                },
              ]}
            >
              {block.isPending ? (
                <ActivityIndicator size={16} />
              ) : (
                <MaterialCommunityIcons
                  name="block-helper"
                  size={17}
                  color={theme.colors.error}
                />
              )}
              <AppText
                variant="bodySmallStrong"
                style={{
                  color: theme.colors.error,
                }}
              >
                {t(Translations.PROFILE_VIEW_BLOCK)}
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CustomModal {...modalProps} onDismiss={closeModal}>
        <AppText
          variant="h3"
          style={[
            styles.modalText,
            {
              color: theme.colors.onSurface,
            },
          ]}
        >
          {t(
            pendingAction === 'block'
              ? Translations.PROFILE_VIEW_BLOCK_TITLE
              : Translations.PROFILE_VIEW_UNMATCH_TITLE,
            { name: displayName },
          )}
        </AppText>
        <Spacer spacing={Spacing.sm} />
        <AppText
          variant="body"
          style={[
            styles.modalText,
            {
              color: theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {t(
            pendingAction === 'block'
              ? Translations.PROFILE_VIEW_BLOCK_BODY
              : Translations.PROFILE_VIEW_UNMATCH_BODY,
          )}
        </AppText>
        <Spacer spacing={Spacing.lg} />
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
        <Spacer spacing={Spacing.sm} />
        <AppButton variant="link" onPress={closeModal}>
          {t(Translations.PROFILE_VIEW_UNMATCH_CANCEL)}
        </AppButton>
      </CustomModal>

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centerNote: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  roundOnPhoto: {
    width: Layout.CHAT_AVATAR,
    height: Layout.CHAT_AVATAR,
    borderRadius: Layout.CHAT_AVATAR / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onPhotoShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  body: {
    flex: 1,
    paddingHorizontal: Layout.SCREEN_PADDING,
    marginTop: Layout.HERO_CONTENT_OVERLAP,
  },
  messageButton: {
    borderRadius: Layout.BUTTON_LG_RADIUS,
    overflow: 'hidden',
  },
  messageButtonFill: {
    height: Layout.BUTTON_LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  sectionLabel: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Layout.SECTION_GAP,
  },
  bio: {
    marginTop: Layout.CHIP_GAP,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.CHIP_GAP,
    marginTop: Spacing.sm + 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.PROGRESS_BAR_GAP,
    paddingHorizontal: Layout.CHIP_PADDING_H,
    paddingVertical: Layout.CHIP_PADDING_V,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  destructiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  destructiveButton: {
    flex: 1,
    height: Layout.BUTTON_LG - 6,
    borderRadius: (Layout.BUTTON_LG - 6) / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.CHIP_GAP,
  },
  modalText: {
    textAlign: 'center',
  },
});
