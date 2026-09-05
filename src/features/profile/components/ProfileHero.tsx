import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Pressable,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from '@shared/components/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

// The paged photo hero, shared by your own profile and someone else's.
// It is deliberately the same visual language as the Discover card: a
// profile should read as "your own card", which is the whole reason the
// gallery section was dropped.
//
// This is where §3's second light-mode branch lives. In dark the scrim
// runs all the way to the GROUND colour, so the photo dissolves into the
// page with no seam. In light there is nothing to dissolve into — fading
// a photo into near-white reads as a rendering bug — so the image stops
// on a hard edge with a 28px bottom radius instead.

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ProfileHeroProps = {
  photoUrls: string[];
  // A profile whose media rows predate `position` still has this, so an
  // old account never renders a blank hero.
  fallbackUrl?: string | null;
  displayName: string;
  age?: number | null;
  city?: string | null;
  // null means "we cannot tell yet" — no home and/or no current fix. The
  // pill says so rather than guessing LOCAL.
  mode: 'local' | 'traveler' | null;
  modeLabel: string;
  // How far away they are right now. Only ever shown on someone else's
  // profile — your own distance from yourself is not information.
  distanceLabel?: string | null;
  // The control in the top-right: a settings gear on your own profile, an
  // overflow menu on someone else's.
  rightAction?: React.ReactNode;
  // The top-LEFT slot. On your own profile the photo counter lives there;
  // pass a back button and it takes that place instead, because the two
  // would otherwise collide.
  leftAction?: React.ReactNode;
};

const ProfileHero = ({
  photoUrls,
  fallbackUrl,
  displayName,
  age,
  city,
  mode,
  modeLabel,
  distanceLabel,
  rightAction,
  leftAction,
}: ProfileHeroProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { t } = useTranslation();

  const photos =
    photoUrls.length > 0 ? photoUrls : fallbackUrl ? [fallbackUrl] : [];
  const [rawIndex, setRawIndex] = useState(0);
  const paged = photos.length > 1;
  // Clamp ONCE, here, and let everything below read the clamped value.
  const index = Math.min(rawIndex, Math.max(photos.length - 1, 0));
  const current = photos[index];

  const heroHeight = screenHeight * Layout.HERO_HEIGHT_RATIO;

  const onTap = (x: number) => {
    if (!paged) return;
    // From the clamped index, not the stored one, or a stale value that
    // is past the end swallows the first few taps.
    if (x < SCREEN_WIDTH / 3) {
      setRawIndex(Math.max(index - 1, 0));
    } else {
      setRawIndex(Math.min(index + 1, photos.length - 1));
    }
  };

  const modePillColor =
    mode === 'traveler'
      ? theme.colors.modeTravelerOnPhoto
      : mode === 'local'
        ? theme.colors.modeLocalOnPhoto
        : // Unknown mode gets the neutral scrim tone, not a colour that
          // would assert one of the two answers.
          theme.colors.BLACK_A35;
  const modeIcon =
    mode === 'traveler'
      ? 'airplane'
      : mode === 'local'
        ? 'home-variant-outline'
        : 'map-marker-question-outline';

  return (
    <View
      style={[
        styles.hero,
        {
          height: heroHeight,
          // Same hole the deck card had: no background, so a photo that
          // has not loaded yet leaves the page showing through where a
          // face should be. Less alarming here than in the deck — there
          // is no second profile stacked underneath — but it is the same
          // flash of nothing, and the same surface fixes it.
          backgroundColor: theme.colors.surfaceVariant,
        },
        // See the header comment: the light hero ends on an edge, the dark
        // one dissolves.
        theme.dark ? null : styles.heroEdgeLight,
      ]}
    >
      {current ? (
        <Image
          source={{
            uri: current,
          }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t(Common.A11Y_PROFILE_PHOTO, {
            name: displayName,
          })}
          style={styles.image}
        />
      ) : (
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.image, styles.fallback]}
        >
          <AppIcon name="account" size={96} color={theme.colors.onGradient} />
        </LinearGradient>
      )}

      {paged ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={e => onTap(e.nativeEvent.locationX)}
          accessibilityRole="button"
          accessibilityLabel={t(Translations.PROFILE_PHOTO_COUNT, {
            current: index + 1,
            total: photos.length,
          })}
        />
      ) : null}

      <LinearGradient
        colors={[theme.colors.scrimMid, theme.colors.scrimTransparent]}
        style={styles.scrimTop}
        pointerEvents="none"
      />

      <LinearGradient
        colors={[
          theme.colors.scrimTransparent,
          theme.colors.scrimMid,
          // The last stop is the difference between the themes. Dark ends
          // on the page background so there is no seam at all; light ends
          // on the scrim and lets the rounded edge do the separating.
          theme.dark ? theme.colors.background : theme.colors.scrimStrong,
        ]}
        locations={[0, 0.46, 1]}
        style={styles.scrimBottom}
        pointerEvents="none"
      />

      {paged ? (
        <View
          style={[
            styles.progressRow,
            {
              top: insets.top + Layout.PROGRESS_TOP_OFFSET,
            },
          ]}
          pointerEvents="none"
        >
          {photos.map((url, i) => (
            <View
              key={url}
              style={[
                styles.progressBar,
                {
                  backgroundColor:
                    i === index
                      ? theme.colors.ON_PHOTO
                      : theme.colors.progressIdle,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      <View
        style={[
          styles.headerRow,
          {
            top: insets.top + Layout.HEADER_TOP_OFFSET,
          },
        ]}
        pointerEvents="box-none"
      >
        {leftAction ??
          (paged ? (
            <View
              style={[
                styles.countPill,
                {
                  backgroundColor: theme.colors.headerPill,
                  borderColor: theme.colors.headerPillBorder,
                },
                theme.dark ? null : styles.pillShadow,
              ]}
            >
              <AppIcon
                name="camera-outline"
                size={12}
                color={theme.colors.onHeaderPill}
              />
              <AppText
                variant="microStrong"
                style={[
                  styles.countText,
                  {
                    color: theme.colors.onHeaderPill,
                  },
                ]}
              >
                {t(Translations.PROFILE_PHOTO_COUNT, {
                  current: index + 1,
                  total: photos.length,
                })}
              </AppText>
            </View>
          ) : (
            // Keeps the right-hand control pinned right when there is no
            // count pill to push it there.
            <View />
          ))}

        {rightAction}
      </View>

      <View style={styles.info} pointerEvents="none">
        <View style={styles.metaRow}>
          <View
            style={[
              styles.modePill,
              {
                backgroundColor: modePillColor,
              },
            ]}
          >
            <AppIcon name={modeIcon} size={11} color={theme.colors.ON_PHOTO} />
            <AppText
              variant="overline"
              style={{
                color: theme.colors.ON_PHOTO,
              }}
            >
              {modeLabel}
            </AppText>
          </View>

          {city ? (
            <View style={styles.cityRow}>
              <AppIcon
                name="home-outline"
                size={13}
                color={theme.colors.WHITE_A85}
              />
              <AppText
                variant="caption"
                style={{
                  color: theme.colors.WHITE_A85,
                }}
              >
                {city}
              </AppText>
            </View>
          ) : null}

          {distanceLabel ? (
            <View style={styles.cityRow}>
              <AppIcon
                name="map-marker-outline"
                size={13}
                color={theme.colors.WHITE_A85}
              />
              <AppText
                variant="caption"
                style={{
                  color: theme.colors.WHITE_A85,
                }}
              >
                {distanceLabel}
              </AppText>
            </View>
          ) : null}
        </View>

        <AppText
          variant="displayLg"
          accessibilityRole="header"
          style={{
            color: theme.colors.ON_PHOTO,
          }}
        >
          {age != null
            ? t(Translations.PROFILE_NAME_AGE, {
                name: displayName,
                age,
              })
            : displayName}
        </AppText>
      </View>
    </View>
  );
};

export default ProfileHero;

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    overflow: 'hidden',
  },
  heroEdgeLight: {
    borderBottomLeftRadius: Layout.HERO_EDGE_RADIUS,
    borderBottomRightRadius: Layout.HERO_EDGE_RADIUS,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '26%',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '56%',
  },
  progressRow: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    gap: Layout.PROGRESS_BAR_GAP,
  },
  progressBar: {
    flex: 1,
    height: Layout.PROGRESS_BAR_HEIGHT,
    borderRadius: Layout.PROGRESS_BAR_RADIUS,
  },
  headerRow: {
    position: 'absolute',
    left: Layout.SCREEN_PADDING,
    right: Layout.SCREEN_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.PROGRESS_BAR_GAP,
    height: Layout.PILL_HEIGHT_SM,
    paddingHorizontal: Layout.PILL_PADDING_H,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  countText: {
    fontVariant: ['tabular-nums'],
  },
  pillShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  info: {
    position: 'absolute',
    left: Layout.SCREEN_PADDING,
    right: Layout.SCREEN_PADDING,
    bottom: Layout.HERO_INFO_BOTTOM,
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.PROGRESS_BAR_GAP,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.PROGRESS_BAR_GAP,
  },
});
