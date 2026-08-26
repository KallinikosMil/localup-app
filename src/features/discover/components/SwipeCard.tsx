import React, { useState } from 'react';
import { StyleSheet, View, Image, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import YesMark from '@shared/components/YesMark';
import { type Candidate } from '../hooks/useDiscover';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '../i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

// The design shows four chips before wrapping to a second row; past that
// the block starts crowding the action buttons.
const MAX_CHIPS = 4;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

type SwipeCardProps = {
  candidate: Candidate;
  // Room the screen's floating chrome (action row + tab bar) needs at the
  // bottom. The card is full-bleed, so without this the name and chips
  // would render underneath the buttons.
  bottomInset: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

const SwipeCard = ({
  candidate,
  bottomInset,
  onSwipeLeft,
  onSwipeRight,
}: SwipeCardProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // `avatar_url` still backs a profile whose media rows predate
  // `position`, so an old account never renders a blank hero.
  const photos =
    candidate.photo_urls.length > 0
      ? candidate.photo_urls
      : candidate.avatar_url
        ? [candidate.avatar_url]
        : [];

  const [photoIndex, setPhotoIndex] = useState(0);
  // A candidate with one photo gets no bars at all. One bar spanning the
  // whole width says nothing, and four bars over one image is a lie about
  // how much there is to see.
  const paged = photos.length > 1;
  const current = photos[Math.min(photoIndex, photos.length - 1)];

  const shared = new Set(candidate.shared_interest_names);
  const chips = candidate.interest_names.slice(0, MAX_CHIPS);
  const overflow = Math.max(candidate.interest_names.length - MAX_CHIPS, 0);

  const isTraveler = candidate.candidate_mode === 'traveler';

  // Tap the left third to go back, the right two thirds to go forward —
  // the standard stories gesture. It stops at both ends rather than
  // wrapping: wrapping makes it impossible to tell a 4-photo profile you
  // have seen all of from one you are looping through.
  const onTapPhoto = (x: number) => {
    if (!paged) return;
    if (x < SCREEN_WIDTH / 3) {
      setPhotoIndex(i => Math.max(i - 1, 0));
    } else {
      setPhotoIndex(i => Math.min(i + 1, photos.length - 1));
    }
  };

  // V16. An unconstrained Pan claims every drag, including the downward
  // one pull-to-refresh needs. `activeOffsetX` says: only take over once
  // the finger has moved 12px HORIZONTALLY. A swipe is horizontal by
  // definition, so the card loses nothing.
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate(e => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd(e => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 15 });
        runOnJS(onSwipeRight)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 15 });
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: translateX.value,
      },
      {
        translateY: translateY.value,
      },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-9, 0, 9],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {current ? (
          <Image
            source={{
              uri: current,
            }}
            // The photo IS the content here, so unlike the small avatars
            // elsewhere this one is named rather than hidden.
            accessible
            accessibilityRole="image"
            accessibilityLabel={t(Common.A11Y_PROFILE_PHOTO, {
              name: candidate.display_name ?? '',
            })}
            style={styles.image}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.placeholder,
              {
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="account"
              size={80}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        )}

        {/* Sits under the furniture but over the photo, so the tap targets
            for paging never steal a press from the action buttons. */}
        {paged ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={e => onTapPhoto(e.nativeEvent.locationX)}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.DISCOVER_A11Y_NEXT_PHOTO, {
              current: photoIndex + 1,
              total: photos.length,
            })}
          />
        ) : null}

        {/* Top scrim. Added after testing against a real upload rather
            than the handoff's placeholder gradients: the header sat over a
            white radiator and its white text nearly disappeared. */}
        <LinearGradient
          colors={[theme.colors.scrimMid, theme.colors.scrimTransparent]}
          style={styles.scrimTop}
          pointerEvents="none"
        />

        {/* Bottom scrim: a near-black violet rather than flat black, so
            the photo fades into the ground instead of greying out. */}
        <LinearGradient
          colors={[
            theme.colors.scrimTransparent,
            theme.colors.scrimMid,
            theme.colors.scrimStrong,
          ]}
          locations={[0, 0.38, 0.9]}
          style={styles.scrimBottom}
          pointerEvents="none"
        />

        {paged ? (
          <View
            style={[
              styles.progressRow,
              {
                // The design's 50px assumes one status bar height; on a
                // device with a different one it has to move with it.
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
                      i === photoIndex
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
            styles.info,
            {
              paddingBottom: bottomInset,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.metaRow}>
            <View
              style={[
                styles.modePill,
                {
                  backgroundColor: isTraveler
                    ? theme.colors.modeTravelerOnPhoto
                    : theme.colors.modeLocalOnPhoto,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isTraveler ? 'airplane' : 'home-variant-outline'}
                size={11}
                color={theme.colors.ON_PHOTO}
              />
              <AppText
                variant="overline"
                style={{
                  color: theme.colors.ON_PHOTO,
                }}
              >
                {isTraveler
                  ? t(Common.COMMON_MODE_TRAVELER)
                  : t(Common.COMMON_MODE_LOCAL)}
              </AppText>
            </View>

            {candidate.home_city ? (
              <View style={styles.cityRow}>
                <MaterialCommunityIcons
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
                  {candidate.home_city}
                </AppText>
              </View>
            ) : null}
          </View>

          <AppText
            variant="displayLg"
            style={[
              styles.name,
              {
                color: theme.colors.ON_PHOTO,
              },
            ]}
          >
            {t(Translations.DISCOVER_NAME_AGE, {
              name: candidate.display_name,
              age: candidate.age,
            })}
          </AppText>

          {candidate.bio ? (
            <AppText
              variant="body"
              style={[
                styles.bio,
                {
                  color: theme.colors.WHITE_A85,
                },
              ]}
              numberOfLines={3}
            >
              {candidate.bio}
            </AppText>
          ) : null}

          {chips.length > 0 ? (
            <View style={styles.tagRow}>
              {chips.map(tag => {
                const isShared = shared.has(tag);
                return (
                  <View
                    key={tag}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isShared
                          ? theme.colors.chipShared
                          : theme.colors.chipOnPhoto,
                        borderColor: isShared
                          ? theme.colors.chipSharedBorder
                          : theme.colors.chipOnPhotoBorder,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={[
                        isShared ? styles.chipSharedText : null,
                        {
                          color: isShared
                            ? theme.colors.onChipShared
                            : theme.colors.ON_PHOTO,
                        },
                      ]}
                    >
                      {tag}
                    </AppText>
                  </View>
                );
              })}
              {overflow > 0 ? (
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.colors.chipOnPhoto,
                      borderColor: theme.colors.chipOnPhotoBorder,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: theme.colors.ON_PHOTO,
                    }}
                  >
                    {`+${overflow}`}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <Animated.View
          style={[
            styles.stamp,
            styles.likeStamp,
            {
              borderColor: theme.colors.like,
            },
            likeOpacity,
          ]}
          pointerEvents="none"
        >
          <YesMark size={40} color={theme.colors.like} />
          <AppText
            variant="h2"
            style={{
              color: theme.colors.like,
            }}
          >
            {t(Translations.DISCOVER_STAMP_LIKE)}
          </AppText>
        </Animated.View>

        <Animated.View
          style={[
            styles.stamp,
            styles.nopeStamp,
            {
              borderColor: theme.colors.pass,
            },
            nopeOpacity,
          ]}
          pointerEvents="none"
        >
          <AppText
            variant="h2"
            style={{
              color: theme.colors.pass,
            }}
          >
            {t(Translations.DISCOVER_STAMP_NOPE)}
          </AppText>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

export default SwipeCard;

const styles = StyleSheet.create({
  // Full-bleed. The card is the screen now — no inset, no radius, no
  // surface behind it. That is the whole point of the direction: the
  // photo is the page, and everything else floats on it.
  card: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '72%',
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '22%',
  },
  progressRow: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: 5,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    gap: 9,
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
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    letterSpacing: -0.9,
  },
  bio: {
    lineHeight: 21,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  chipSharedText: {
    fontWeight: '700',
  },
  stamp: {
    position: 'absolute',
    top: 110,
    borderWidth: 3,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  likeStamp: {
    left: 24,
    transform: [{ rotate: '-20deg' }],
  },
  nopeStamp: {
    right: 24,
    transform: [{ rotate: '20deg' }],
  },
});
