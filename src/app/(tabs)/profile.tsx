import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { ActivityIndicator, Chip, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import RetryButton from '@shared/components/RetryButton';
import useLocation from '@shared/hooks/useLocation';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { useLogout } from '@features/auth/hooks/useAuth';
import { useDeleteAccount } from '@features/auth/hooks/useDeleteAccount';
import CustomModal from '@shared/components/CustomModal';
import AppButton from '@shared/components/AppButton';
import { useProfile, usePhotos } from '@features/profile/hooks/useProfile';
import { computeMode } from '@features/profile/utils/mode';
import { useAppTheme } from '@theme/paper';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';

export default function ProfileScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const {
    data: profile,
    // isPending (not isLoading): true while the query is still
    // disabled (uid not in the store yet) — otherwise the ghost
    // profile below would render for those frames.
    isPending,
    isError,
    error,
    refetch: refetchProfile,
    isRefetching: profileRefetching,
  } = useProfile();
  const {
    data: photos,
    isError: photosError,
    refetch: refetchPhotos,
    isRefetching: photosRefetching,
  } = usePhotos(profile?.user_id);

  // Logout can fail (offline, server). Without this the button just
  // un-spun and the user stayed silently signed in, thinking they'd left.
  const [logoutError, setLogoutError] = useState<string | null>(null);
  // Deleting is irreversible, so it is gated behind an explicit confirmation
  // rather than a single tap. On success there is nothing to navigate to —
  // the hook clears the session and AppGuard routes to login by itself.
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

  // null === "we can't tell yet" (no home and/or no current coords).
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
        {slowLoading ? (
          <AppText
            variant="body"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginTop: Spacing.SPACING_PADDING_16,
            }}
          >
            {t(Translations.PROFILE_WAKING)}
          </AppText>
        ) : null}
      </View>
    );
  }

  // H2: a failed profile read used to render a GHOST profile — name
  // "—", "add a bio", badge LOCAL, no photos — which reads as an empty
  // account, not a failure. And pull-to-refresh lives inside the
  // ScrollView below, which never rendered on a hang, so there was no
  // way to retry at all. Say what happened; give them the button.
  //
  // V13 — two fixes, both about the error state being EXCLUSIVE:
  //
  //  1. The icon was `account-alert-outline`. That glyph is an avatar
  //     WITH an exclamation mark welded to it, so the failure screen
  //     rendered a profile icon and an error icon side by side and read
  //     as "here is your profile, and also something is broken". It's
  //     `alert-circle-outline` now — the same icon Matches uses, which
  //     says one thing: this failed.
  //
  //  2. `isError` alone yanked the whole screen away even when RQ still
  //     held a perfectly good cached profile (a failed pull-to-refresh
  //     kept the data but flipped the flag). Gate on `!profile` too, so
  //     the error branch takes the frame only when there is genuinely
  //     nothing to show — mirroring Discover's `isError && !current`.
  //     When we DO show it, it owns the frame: no header, no avatar, no
  //     content above or below it.
  if (isError && !profile) {
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
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: Spacing.SPACING_PADDING_12,
          }}
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

  const surfaceLow = blendSurface(
    theme.colors.background,
    theme.colors.primaryContainer,
    0.18,
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={profileRefetching || photosRefetching}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Hero: full-bleed photo (or a tonal fallback) with a bottom
            scrim, the identity overlaid, and a floating Edit pill — the
            same visual language as the Discover card, so a profile reads
            as "your own card". */}
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

          <Pressable
            onPress={() => router.push('/profile/edit')}
            accessibilityRole="button"
            accessibilityLabel={t(Common.A11Y_EDIT_PROFILE)}
            hitSlop={12}
            style={[
              styles.editPill,
              { backgroundColor: theme.colors.BLACK_A35, top: insets.top + 8 },
            ]}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={14}
              color={theme.colors.ON_PHOTO}
            />
            <AppText
              variant="caption"
              style={{
                color: theme.colors.ON_PHOTO,
                fontWeight: '700',
                marginLeft: 6,
              }}
            >
              {t(Translations.PROFILE_EDIT_ACTION)}
            </AppText>
          </Pressable>

          <View style={styles.heroInfo}>
            <AppText variant="h1" style={{ color: theme.colors.ON_PHOTO }}>
              {profile?.display_name ?? t(Translations.PROFILE_NO_NAME)}
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
              {/* Mode badge. H5: `mode` is null until coords land — a
                  neutral badge says "we don't know yet" instead of
                  guessing LOCAL. */}
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

        {/* Body */}
        <View style={styles.body}>
          {/* About */}
          <Section
            title={t(Translations.PROFILE_SECTION_ABOUT)}
            bg={theme.colors.surface}
          >
            <AppText
              variant="body"
              style={{
                color: theme.colors.onSurface,
                lineHeight: 22,
              }}
            >
              {profile?.bio?.trim() || t(Translations.PROFILE_BIO_EMPTY)}
            </AppText>
          </Section>

          {/* Photos. A failed read must not masquerade as an empty gallery
          (the PR-H2 rule): show it only as empty when the read actually
          succeeded with zero photos; surface an error otherwise. A
          stale-but-usable list keeps rendering even if a refetch errors. */}
          {photos && photos.length > 0 ? (
            <>
              <Spacer spacing={Spacing.SPACING_PADDING_16} />
              <Section
                title={t(Translations.PROFILE_SECTION_GALLERY)}
                bg={theme.colors.surface}
              >
                <View>
                  {photos.map(p => (
                    <View
                      key={p.id}
                      style={[
                        styles.photoFull,
                        {
                          backgroundColor: surfaceLow,
                        },
                      ]}
                    >
                      <Image source={{ uri: p.url }} style={styles.photoImg} />
                    </View>
                  ))}
                </View>
              </Section>
            </>
          ) : photosError ? (
            <>
              <Spacer spacing={Spacing.SPACING_PADDING_16} />
              <Section
                title={t(Translations.PROFILE_SECTION_GALLERY)}
                bg={theme.colors.surface}
              >
                <AppText
                  variant="body"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t(Translations.PROFILE_GALLERY_ERROR)}
                </AppText>
              </Section>
            </>
          ) : null}

          {/* Interests */}
          {profile?.interests && profile.interests.length > 0 ? (
            <>
              <Spacer spacing={Spacing.SPACING_PADDING_16} />
              <Section
                title={t(Translations.PROFILE_SECTION_INTERESTS)}
                bg={theme.colors.surface}
              >
                <View style={styles.chips}>
                  {profile.interests.map(interest => (
                    <Chip
                      key={interest}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: surfaceLow,
                        },
                      ]}
                      textStyle={{
                        color: theme.colors.onSurface,
                      }}
                    >
                      {interest}
                    </Chip>
                  ))}
                </View>
              </Section>
            </>
          ) : null}

          <Spacer spacing={Spacing.SPACING_PADDING_32} />

          {/* Quiet, low-emphasis log out — deliberately not a primary
              button (it competed with Edit before). */}
          <Pressable
            onPress={() =>
              logout.mutate(undefined, {
                onError: err =>
                  setLogoutError(
                    errorMessage(err, Translations.PROFILE_LOGOUT_ERROR),
                  ),
              })
            }
            hitSlop={8}
            disabled={logout.isPending}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.PROFILE_LOGOUT)}
            accessibilityState={{ disabled: logout.isPending }}
            style={styles.logout}
          >
            {logout.isPending ? (
              <ActivityIndicator size={16} />
            ) : (
              <MaterialCommunityIcons
                name="logout"
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
              {t(Translations.PROFILE_LOGOUT)}
            </AppText>
          </Pressable>

          {/* Below logout and quieter still: destructive, so it must be
              findable (Google Play requires it) without ever being the thing
              a thumb lands on by accident. */}
          <Pressable
            onPress={() => setConfirmDelete(true)}
            hitSlop={8}
            disabled={deleteAccount.isPending}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.PROFILE_DELETE_ACCOUNT)}
            accessibilityHint={t(Translations.PROFILE_DELETE_BODY)}
            accessibilityState={{ disabled: deleteAccount.isPending }}
            style={styles.deleteAccount}
          >
            {deleteAccount.isPending ? (
              <ActivityIndicator size={14} />
            ) : (
              <AppText
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t(Translations.PROFILE_DELETE_ACCOUNT)}
              </AppText>
            )}
          </Pressable>
        </View>
      </ScrollView>
      <CustomModal
        visible={confirmDelete}
        onDismiss={() => setConfirmDelete(false)}
      >
        <AppText
          variant="h3"
          style={{ color: theme.colors.onSurface, textAlign: 'center' }}
        >
          {t(Translations.PROFILE_DELETE_TITLE)}
        </AppText>
        <Spacer spacing={Spacing.SPACING_PADDING_8} />
        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
          }}
        >
          {t(Translations.PROFILE_DELETE_BODY)}
        </AppText>
        <Spacer spacing={Spacing.SPACING_PADDING_24} />
        {/* The safe choice is the prominent one. The destructive choice is
            reachable but never the default. */}
        <AppButton variant="primary" onPress={() => setConfirmDelete(false)}>
          {t(Translations.PROFILE_DELETE_CANCEL)}
        </AppButton>
        <Spacer spacing={Spacing.SPACING_PADDING_12} />
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
          labelStyle={{ color: theme.colors.error }}
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

const Section = ({
  title,
  bg,
  children,
}: {
  title: string;
  bg: string;
  children: React.ReactNode;
}) => {
  const theme = useAppTheme();
  return (
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
      <View style={[styles.sectionCard, { backgroundColor: bg }]}>
        {children}
      </View>
    </View>
  );
};

const blendSurface = (base: string, tint: string, t: number) => {
  const b = hexToRgb(base);
  const tt = hexToRgb(tint);
  if (!b || !tt) return base;
  const r = Math.round(b.r + (tt.r - b.r) * t);
  const g = Math.round(b.g + (tt.g - b.g) * t);
  const bl = Math.round(b.b + (tt.b - b.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

const hexToRgb = (hex: string) => {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
  content: {
    paddingBottom: Spacing.SPACING_PADDING_32,
  },
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
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  editPill: {
    position: 'absolute',
    right: Spacing.SPACING_PADDING_16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
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
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  deleteAccount: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.SPACING_PADDING_16,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.SPACING_PADDING_12,
  },
  sectionCard: {
    padding: Spacing.SPACING_PADDING_16,
    borderRadius: BorderRadius.xxl,
  },
  // Full width, portrait, stacked — the same treatment a match's profile
  // gets, so your own profile shows you exactly what they see.
  photoFull: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.SPACING_PADDING_12,
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: BorderRadius.pill,
  },
});
