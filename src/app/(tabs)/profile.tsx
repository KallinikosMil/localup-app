import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import RetryButton from '@shared/components/RetryButton';
import useLocation from '@shared/hooks/useLocation';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { ageFromISODate } from '@shared/utils/date';
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
          // The hero has had a right-hand slot since it was written and
          // this screen never filled it. Everything that used to sit at
          // the bottom of the page lives behind it now.
          rightAction={
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_SETTINGS)}
              hitSlop={Layout.HIT_SLOP}
              style={[
                styles.gear,
                {
                  backgroundColor: theme.colors.headerPill,
                  borderColor: theme.colors.headerPillBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={20}
                color={theme.colors.onHeaderPill}
              />
            </Pressable>
          }
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
        </View>
      </ScrollView>
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
  // Same pill as the back button on someone else's profile — it sits on
  // a photo, so it needs its own ground rather than the page's.
  gear: {
    width: Layout.CHAT_AVATAR,
    height: Layout.CHAT_AVATAR,
    borderRadius: Layout.CHAT_AVATAR / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
