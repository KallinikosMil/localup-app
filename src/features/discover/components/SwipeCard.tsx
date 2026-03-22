import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
} from 'react-native';
import { useTheme } from 'react-native-paper';
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
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

import AppText from
  '@shared/components/AppText';
import { Spacing } from
  '@theme/constants/Spacing';
import { BorderRadius } from
  '@theme/constants/BorderRadius';
import {
  type Candidate,
} from '../hooks/useDiscover';

const { width: SCREEN_WIDTH } =
  Dimensions.get('window');
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
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate(e => {
      translateX.value = e.translationX;
      translateY.value =
        e.translationY * 0.3;
    })
    .onEnd(e => {
      if (
        e.translationX >
        SWIPE_THRESHOLD
      ) {
        translateX.value = withSpring(
          SCREEN_WIDTH * 1.5,
          { damping: 15 },
        );
        runOnJS(onSwipeRight)();
      } else if (
        e.translationX <
        -SWIPE_THRESHOLD
      ) {
        translateX.value = withSpring(
          -SCREEN_WIDTH * 1.5,
          { damping: 15 },
        );
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(
          0,
        );
        translateY.value = withSpring(
          0,
        );
      }
    });

  const cardStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX:
            translateX.value,
        },
        {
          translateY:
            translateY.value,
        },
        {
          rotate: `${interpolate(
            translateX.value,
            [
              -SCREEN_WIDTH,
              0,
              SCREEN_WIDTH,
            ],
            [-15, 0, 15],
            Extrapolation.CLAMP,
          )}deg`,
        },
      ],
    }),
  );

  const likeOpacity = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    }),
  );

  const nopeOpacity = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD, 0],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    }),
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.card,
          cardStyle,
        ]}
      >
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
                backgroundColor:
                  theme.colors
                    .surfaceVariant,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="account"
              size={80}
              color={
                theme.colors
                  .onSurfaceVariant
              }
            />
          </View>
        )}

        <LinearGradient
          colors={[
            'transparent',
            'rgba(0,0,0,0.7)',
          ]}
          style={styles.gradient}
        />

        <View style={styles.info}>
          <AppText
            variant="h2"
            style={styles.name}
          >
            {candidate.display_name}
          </AppText>

          {candidate.home_city && (
            <View
              style={styles.locationRow}
            >
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={16}
                color="#fff"
              />
              <AppText
                variant="caption"
                style={styles.location}
              >
                {candidate.home_city}
              </AppText>
            </View>
          )}

          {candidate.bio && (
            <AppText
              variant="body"
              style={styles.bio}
              numberOfLines={2}
            >
              {candidate.bio}
            </AppText>
          )}

          {candidate.interests.length >
            0 && (
            <View
              style={styles.tagRow}
            >
              {candidate.interests
                .slice(0, 3)
                .map(tag => (
                  <View
                    key={tag}
                    style={
                      styles.tag
                    }
                  >
                    <AppText
                      variant="caption"
                      style={
                        styles.tagText
                      }
                    >
                      {tag}
                    </AppText>
                  </View>
                ))}
            </View>
          )}
        </View>

        <Animated.View
          style={[
            styles.stamp,
            styles.likeStamp,
            likeOpacity,
          ]}
        >
          <AppText
            variant="h2"
            style={styles.likeText}
          >
            LIKE
          </AppText>
        </Animated.View>

        <Animated.View
          style={[
            styles.stamp,
            styles.nopeStamp,
            nopeOpacity,
          ]}
        >
          <AppText
            variant="h2"
            style={styles.nopeText}
          >
            NOPE
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
    borderRadius: BorderRadius.xxl,
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
    height: '45%',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.SPACING_PADDING_24,
  },
  name: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  location: {
    color: 'rgba(255,255,255,0.85)',
  },
  bio: {
    color: 'rgba(255,255,255,0.8)',
    marginTop:
      Spacing.SPACING_PADDING_8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.SPACING_PADDING_8,
    marginTop:
      Spacing.SPACING_PADDING_8,
  },
  tag: {
    backgroundColor:
      'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    color: '#fff',
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
    borderColor: '#4CD964',
    transform: [
      { rotate: '-20deg' },
    ],
  },
  nopeStamp: {
    right: 24,
    borderColor: '#FF3B30',
    transform: [
      { rotate: '20deg' },
    ],
  },
  likeText: {
    color: '#4CD964',
    fontWeight: '700',
  },
  nopeText: {
    color: '#FF3B30',
    fontWeight: '700',
  },
});
