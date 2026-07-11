import React from 'react';
import { StyleSheet, View, Image, Dimensions } from 'react-native';
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
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import AppText from '@shared/components/AppText';
import ModeBadge from '@shared/components/ModeBadge';
import InterestChip from '@shared/components/InterestChip';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { type Candidate } from '../hooks/useDiscover';
import { Translations } from '../i18n/translationKeys';

const MAX_CHIPS = 3;

// Distance display rule (UI-1 nit):
// "0.0 km" reads broken — anything
// under 1 km is just "nearby".
const formatDistance = (km: number, t: TFunction) =>
  km < 1
    ? t(Translations.DISCOVER_DISTANCE_NEARBY)
    : t(Translations.DISCOVER_DISTANCE_KM, {
        km: km.toFixed(1),
      });

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

type SwipeCardProps = {
  candidate: Candidate;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

const SwipeCard = ({
  candidate,
  onSwipeLeft,
  onSwipeRight,
}: SwipeCardProps) => {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const overflow = Math.max(candidate.interests.length - MAX_CHIPS, 0);

  const pan = Gesture.Pan()
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
          [-15, 0, 15],
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
        {candidate.avatar_url ? (
          <Image
            source={{
              uri: candidate.avatar_url,
            }}
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

        <LinearGradient
          colors={[
            'transparent',
            theme.colors.BLACK_A35,
            theme.colors.BLACK_A75,
          ]}
          style={styles.gradient}
        />

        <View
          style={[
            styles.distancePill,
            {
              backgroundColor: theme.colors.BLACK_A35,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={12}
            color={theme.colors.ON_PHOTO}
          />
          <AppText
            variant="caption"
            style={[
              styles.distanceText,
              {
                color: theme.colors.ON_PHOTO,
              },
            ]}
          >
            {formatDistance(candidate.distance_km, t)}
          </AppText>
        </View>

        <View style={styles.info}>
          <AppText
            variant="h1"
            style={{
              color: theme.colors.ON_PHOTO,
            }}
          >
            {candidate.display_name}
          </AppText>

          <View style={styles.metaRow}>
            {candidate.home_city ? (
              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="home-outline"
                  size={14}
                  color={theme.colors.ON_PHOTO}
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
            <ModeBadge mode={candidate.candidate_mode} />
          </View>

          {candidate.bio ? (
            <AppText
              variant="body"
              style={[
                styles.bio,
                {
                  color: theme.colors.WHITE_A85,
                },
              ]}
              numberOfLines={2}
            >
              {candidate.bio}
            </AppText>
          ) : null}

          {candidate.interests.length > 0 ? (
            <View style={styles.tagRow}>
              {candidate.interests.slice(0, MAX_CHIPS).map(tag => (
                <InterestChip key={tag} label={tag} variant="frosted" />
              ))}
              {overflow > 0 ? (
                <InterestChip label={`+${overflow}`} variant="frosted" />
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
        >
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
  card: {
    width: SCREEN_WIDTH - 32,
    height: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'absolute',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  distancePill: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  distanceText: {
    fontVariant: ['tabular-nums'],
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bio: {
    marginTop: Spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stamp: {
    position: 'absolute',
    top: 40,
    borderWidth: 3,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
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
