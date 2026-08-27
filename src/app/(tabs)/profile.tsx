import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import RetryButton from '@shared/components/RetryButton';
import CustomModal from '@shared/components/CustomModal';
import AppButton from '@shared/components/AppButton';
import useLocation from '@shared/hooks/useLocation';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { ageFromISODate } from '@shared/utils/date';
import { useLogout } from '@features/auth/hooks/useAuth';
import { useDeleteAccount } from '@features/auth/hooks/useDeleteAccount';
import ProfileHero from '@features/profile/components/ProfileHero';
import { useProfile, usePhotos } from '@features/profile/hooks/useProfile';
import { computeMode } from '@features/profile/utils/mode';
import { useAppTheme } from '@theme/paper';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';

// Your own profile, rebuilt as the card a swiper sees. The old Gallery
// section is gone: photos ARE the hero now, paged, and all photo
// management moved into Edit profile. Two places showing the same photos
// differently was the thing that made this screen feel unfinished.

function ProfileScreenContent() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const {
    data: profile,
    // isPending (not isLoading): true while the query is still disabled
    // (uid not in the store yet) — otherwise the ghost profile below
    // would render for those frames.
    isPending,
    isError,
    error,
    refetch: refetchProfile,
    isRefetching: profileRefetching,
  } = useProfile();
  const {
    data: photos,
    refetch: refetchPhotos,
    isRefetching: photosRefetching,
  } = usePhotos(profile?.user_id);

  // Logout can fail (offline, server). Without this the button just
  // un-spun and the user stayed silently signed in, thinking they had
  // left.
  const [logoutError, setLogoutError] = useState<string | null>(null);
  // Deleting is irreversible, so it is gated behind an explicit
  // confirmation rather than a single tap. On success there is nothing to
  // navigate to — the hook clears the session and AppGuard routes to
  // login by itself.
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRefresh = async () => {
    await Promise.all([refetchProfile(), refetchPhotos()]);
  };
  const { latitude, longitude } = useLocation();

  // Reassure the user after a few seconds of loading (matches/chat
  // pattern) — a Supabase project waking from auto-pause is slow.
  const [slowLoading, setSlowLoading] = useState(false);
  useEffect(() => {
    if (!isPending) {
      setSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => setSlowLoading(true), 4500);
    return () => clearTimeout(timer);
  }, [isPending]);

  // null === "we cannot tell yet" (no home and/or no current coords).
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

  if (isPending) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
          },
        ]}
      >
        <ActivityIndicator animating size="large" />
        {slowLoading ? (
          <AppText
            variant="body"
            style={[
              styles.centerNote,
              {
                color: theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {t(Translations.PROFILE_WAKING)}
          </AppText>
        ) : null}
      </View>
    );
  }

  // H2/V13: a failed read must not render a GHOST profile — name "—",
  // "add a bio", badge LOCAL — which reads as an empty account rather
  // than a failure. Gated on `!profile` too, so a failed pull-to-refresh
  // that still holds good cached data keeps showing it.
  if (isError && !profile) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
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
        <RetryButton
          label={t(Translations.PROFILE_RETRY)}
          onPress={() => refetchProfile()}
        />
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
      {/* The hero runs under the status bar, so its icons have to be
          light here regardless of theme — same reasoning as Discover, and
          gated on focus for the same reason (tab screens stay mounted, so
          an unconditional override followed you to the next tab). */}
      {isFocused ? <StatusBar barStyle="light-content" /> : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            // The tab bar floats over the page and takes no layout space.
            paddingBottom:
              insets.bottom + Spacing.lg + Layout.TAB_BAR_HEIGHT + Spacing.lg,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={profileRefetching || photosRefetching}
            onRefresh={handleRefresh}
          />
        }
      >
        <ProfileHero
          photoUrls={(photos ?? []).map(p => p.url)}
          fallbackUrl={profile?.avatar_url}
          displayName={profile?.display_name ?? t(Translations.PROFILE_NO_NAME)}
          age={ageFromISODate(profile?.date_of_birth)}
          city={profile?.home_city}
          mode={mode}
          modeLabel={t(modeLabel)}
        />

        <View style={styles.body}>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.push('/profile/edit')}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_EDIT_FULL)}
              style={styles.editButton}
            >
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.editButtonFill}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={18}
                  color={theme.colors.onGradient}
                />
                <AppText
                  variant="buttonLg"
                  style={{
                    color: theme.colors.onGradient,
                  }}
                >
                  {t(Translations.PROFILE_EDIT_FULL)}
                </AppText>
              </LinearGradient>
            </Pressable>

            {/* A shortcut into the same screen, not a second destination:
                photo management lives inside Edit now, and this lands on
                its grid rather than making the user hunt for it. */}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/profile/edit',
                  params: {
                    focus: 'photos',
                  },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_MANAGE_PHOTOS)}
              style={[
                styles.photosButton,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="camera-outline"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>
          </View>

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
            {profile?.bio?.trim() || t(Translations.PROFILE_BIO_EMPTY)}
          </AppText>

          {profile?.interests && profile.interests.length > 0 ? (
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
                {t(Translations.PROFILE_SECTION_INTERESTS)}
              </AppText>
              <View style={styles.chips}>
                {profile.interests.map(interest => (
                  <View
                    key={interest}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                      }}
                    >
                      {interest}
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Pushes the footer to the bottom of the page rather than
              letting it hang under the interests. On a sparse profile
              that left a big void below two small links and made the
              screen look unfinished. */}
          <View style={styles.spacer} />

          {/* Blocking was one-way until this screen existed — you could
              cut someone off and never change your mind, which is hard to
              defend when the copy also says they are never told. It sits
              with the other account actions rather than behind a settings
              gear that has nothing else in it yet. */}
          <Pressable
            onPress={() => router.push('/profile/blocked')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.PROFILE_BLOCKED_TITLE)}
            style={styles.blockedLink}
          >
            <MaterialCommunityIcons
              name="account-cancel-outline"
              size={17}
              color={theme.colors.onSurfaceVariant}
            />
            <AppText
              variant="labelStrong"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
            >
              {t(Translations.PROFILE_BLOCKED_TITLE)}
            </AppText>
          </Pressable>

          {/* Both quiet, and side by side rather than stacked as buttons:
              neither is something the screen wants you to do. Delete is
              findable because Google Play requires it to be, and tinted
              with the error colour so it can never be mistaken for the
              one beside it. */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={() =>
                logout.mutate(undefined, {
                  onError: err =>
                    setLogoutError(
                      errorMessage(err, Translations.PROFILE_LOGOUT_ERROR),
                    ),
                })
              }
              hitSlop={12}
              disabled={logout.isPending}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_LOGOUT)}
              accessibilityState={{ disabled: logout.isPending }}
            >
              {logout.isPending ? (
                <ActivityIndicator size={16} />
              ) : (
                <AppText
                  variant="labelStrong"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                  }}
                >
                  {t(Translations.PROFILE_LOGOUT)}
                </AppText>
              )}
            </Pressable>

            <Pressable
              onPress={() => setConfirmDelete(true)}
              hitSlop={12}
              disabled={deleteAccount.isPending}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_DELETE_ACCOUNT)}
              accessibilityHint={t(Translations.PROFILE_DELETE_BODY)}
              accessibilityState={{ disabled: deleteAccount.isPending }}
            >
              {deleteAccount.isPending ? (
                <ActivityIndicator size={16} />
              ) : (
                <AppText
                  variant="label"
                  style={{
                    color: theme.colors.error,
                  }}
                >
                  {t(Translations.PROFILE_DELETE_ACCOUNT)}
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CustomModal
        visible={confirmDelete}
        onDismiss={() => setConfirmDelete(false)}
      >
        <AppText
          variant="h3"
          style={[
            styles.modalText,
            {
              color: theme.colors.onSurface,
            },
          ]}
        >
          {t(Translations.PROFILE_DELETE_TITLE)}
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
          {t(Translations.PROFILE_DELETE_BODY)}
        </AppText>
        <Spacer spacing={Spacing.xl} />
        {/* The safe choice is the prominent one. The destructive choice is
            reachable but never the default. */}
        <AppButton variant="primary" onPress={() => setConfirmDelete(false)}>
          {t(Translations.PROFILE_DELETE_CANCEL)}
        </AppButton>
        <Spacer spacing={Spacing.md} />
        <AppButton
          variant="link"
          onPress={() => {
            setConfirmDelete(false);
            deleteAccount.mutate(undefined, {
              onError: err =>
                setLogoutError(
                  errorMessage(err, Translations.PROFILE_DELETE_ERROR),
                ),
            });
          }}
          labelStyle={{
            color: theme.colors.error,
          }}
        >
          {t(Translations.PROFILE_DELETE_CONFIRM)}
        </AppButton>
      </CustomModal>

      <Snackbar
        visible={!!logoutError}
        onDismiss={() => setLogoutError(null)}
        duration={4000}
      >
        {logoutError ?? ''}
      </Snackbar>
    </View>
  );
}

// No ScreenSafeArea: the hero is full-bleed and runs under the status
// bar. The loading and error branches take the top inset themselves, and
// the scroll content reserves room for the floating tab bar.
export default function ProfileScreen() {
  return <ProfileScreenContent />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  content: {
    flexGrow: 1,
  },
  body: {
    // Fills whatever the hero leaves, so the spacer below can do its job.
    flex: 1,
    paddingHorizontal: Layout.SCREEN_PADDING,
    // Pulls the action row up over the tail of the hero, so the gradient
    // button overlaps the fade instead of starting after a gap. In light
    // the hero ends on a hard rounded edge, and the same overlap reads as
    // the button sitting on the card.
    marginTop: Layout.HERO_CONTENT_OVERLAP,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  editButton: {
    flex: 1,
    borderRadius: Layout.BUTTON_LG_RADIUS,
    overflow: 'hidden',
  },
  editButtonFill: {
    height: Layout.BUTTON_LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  photosButton: {
    width: Layout.BUTTON_LG,
    height: Layout.BUTTON_LG,
    borderRadius: Layout.BUTTON_LG_RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginTop: Spacing.xl,
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
    paddingHorizontal: Layout.CHIP_PADDING_H,
    paddingVertical: Layout.CHIP_PADDING_V,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  blockedLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.CHIP_GAP,
    marginBottom: Spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.SCREEN_PADDING,
  },
  modalText: {
    textAlign: 'center',
  },
});
