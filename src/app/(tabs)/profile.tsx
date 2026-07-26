import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  useTheme,
  ActivityIndicator,
  Chip,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import Spacer from '@shared/components/Spacer';
import useLocation from '@shared/hooks/useLocation';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { useLogout } from '@features/auth/hooks/useAuth';
import {
  useProfile,
  usePhotos,
  computeMode,
} from '@features/profile/hooks/useProfile';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';

const AVATAR_SIZE = 112;
const PHOTO_SIZE = 96;

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const logout = useLogout();
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
  const modeKnown = mode !== null;
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
        <Pressable
          onPress={() => refetchProfile()}
          hitSlop={8}
          style={[
            styles.retryBtn,
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
            }}
          >
            {t(Translations.PROFILE_RETRY)}
          </AppText>
        </Pressable>
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
        {/* Header */}
        <View style={styles.header}>
          <AppText
            variant="h2"
            style={{
              color: theme.colors.onBackground,
            }}
          >
            {t(Translations.PROFILE_TITLE)}
          </AppText>
          <Pressable
            onPress={() => router.push('/profile/edit')}
            hitSlop={12}
            style={[
              styles.editPill,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={14}
              color={theme.colors.onPrimary}
            />
            <AppText
              variant="caption"
              style={{
                color: theme.colors.onPrimary,
                fontWeight: '700',
                marginLeft: 6,
              }}
            >
              {t(Translations.PROFILE_EDIT_ACTION)}
            </AppText>
          </Pressable>
        </View>

        {/* Avatar + identity */}
        <View style={styles.identity}>
          {profile?.avatar_url ? (
            <Image
              source={{
                uri: profile.avatar_url,
              }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                {
                  backgroundColor: surfaceLow,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={56}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
          <Spacer spacing={Spacing.SPACING_PADDING_12} />
          <AppText
            variant="h2"
            style={{
              color: theme.colors.onBackground,
              textAlign: 'center',
            }}
          >
            {profile?.display_name ?? t(Translations.PROFILE_NO_NAME)}
          </AppText>
          {profile?.home_city ? (
            <View style={styles.cityRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <AppText
                variant="caption"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginLeft: 4,
                }}
              >
                {profile.home_city}
              </AppText>
            </View>
          ) : null}
          <Spacer spacing={Spacing.SPACING_PADDING_8} />
          {/* Mode badge. H5: `mode` is null while the coords are unknown —
            it used to be 'local', so a traveler was badged LOCAL until
            the location landed. A neutral badge says "we don't know
            yet" instead of guessing. */}
          <View
            style={[
              styles.modeBadge,
              {
                backgroundColor: modeKnown
                  ? theme.colors.primaryContainer
                  : theme.colors.surfaceVariant,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={modeIcon}
              size={14}
              color={
                modeKnown
                  ? theme.colors.onPrimaryContainer
                  : theme.colors.onSurfaceVariant
              }
            />
            <AppText
              variant="caption"
              style={{
                color: modeKnown
                  ? theme.colors.onPrimaryContainer
                  : theme.colors.onSurfaceVariant,
                fontWeight: '700',
                marginLeft: 6,
                letterSpacing: 0.5,
              }}
            >
              {t(modeLabel)}
            </AppText>
          </View>
        </View>

        <Spacer spacing={Spacing.SPACING_PADDING_24} />

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
              <View style={styles.photoGrid}>
                {photos.map(p => (
                  <View
                    key={p.id}
                    style={[
                      styles.photoCell,
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

        <AppButton
          variant="outlined"
          onPress={() =>
            logout.mutate(undefined, {
              onError: err =>
                setLogoutError(
                  errorMessage(err, Translations.PROFILE_LOGOUT_ERROR),
                ),
            })
          }
          loading={logout.isPending}
          disabled={logout.isPending}
        >
          {t(Translations.PROFILE_LOGOUT)}
        </AppButton>

        <Spacer spacing={Spacing.SPACING_PADDING_32} />
      </ScrollView>
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
  const theme = useTheme();
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
  retryBtn: {
    marginTop: Spacing.SPACING_PADDING_16,
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingVertical: Spacing.SPACING_PADDING_8,
    borderRadius: BorderRadius.pill,
  },
  content: {
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingTop: Spacing.SPACING_PADDING_24,
    paddingBottom: Spacing.SPACING_PADDING_32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
  },
  identity: {
    alignItems: 'center',
    marginTop: Spacing.SPACING_PADDING_16,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  sectionCard: {
    padding: Spacing.SPACING_PADDING_16,
    borderRadius: BorderRadius.xxl,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
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
