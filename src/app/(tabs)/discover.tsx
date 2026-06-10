import React, {
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  useTheme,
  Portal,
  Modal,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from
  '@shared/components/AppText';
import AppButton from
  '@shared/components/AppButton';
import Spacer from
  '@shared/components/Spacer';
import useLocation from
  '@shared/hooks/useLocation';
import SwipeCard from
  '@features/discover/components/SwipeCard';
import {
  useCandidates,
  useStaleLocationRefetch,
  useSwipe,
  type Candidate,
} from
  '@features/discover/hooks/useDiscover';
import { Spacing } from
  '@theme/constants/Spacing';
import { BorderRadius } from
  '@theme/constants/BorderRadius';

export default function DiscoverScreen() {
  const theme = useTheme();
  const { latitude, longitude, loading: locLoading } =
    useLocation();
  useStaleLocationRefetch(latitude, longitude);
  const {
    data: candidates,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useCandidates();
  const swipe = useSwipe();

  const [currentIndex, setCurrentIndex] =
    useState(0);
  const [matchedUser, setMatchedUser] =
    useState<Candidate | null>(null);

  // Every fresh deck is re-packed from
  // position 0 (the RPC excludes already-
  // swiped users), so the local cursor
  // must follow it.
  useEffect(() => {
    setCurrentIndex(0);
  }, [dataUpdatedAt]);

  // Swipe through the cached deck
  // locally; fetch the next page only
  // when it's consumed. Swipe-exclusion
  // in the RPC is the pagination.
  const deckConsumed =
    !!candidates &&
    candidates.length > 0 &&
    currentIndex >= candidates.length;

  useEffect(() => {
    if (deckConsumed && !isFetching) {
      refetch();
    }
  }, [deckConsumed, isFetching, refetch]);

  const current =
    candidates?.[currentIndex] ?? null;
  const next =
    candidates?.[currentIndex + 1] ??
    null;

  const handleSwipe = useCallback(
    (action: 'liked' | 'passed') => {
      if (!current) return;

      swipe.mutate(
        {
          targetId: current.user_id,
          action,
        },
        {
          onSuccess: result => {
            if (result.matched) {
              setMatchedUser(current);
            }
          },
        },
      );

      setCurrentIndex(prev => prev + 1);
    },
    [current, swipe],
  );

  const handleSwipeRight =
    useCallback(() => {
      handleSwipe('liked');
    }, [handleSwipe]);

  const handleSwipeLeft =
    useCallback(() => {
      handleSwipe('passed');
    }, [handleSwipe]);

  const dismissMatch = () => {
    setMatchedUser(null);
  };

  if (
    locLoading ||
    isLoading ||
    deckConsumed
  ) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator
          animating
          size="large"
        />
      </View>
    );
  }

  // Note: locError no longer blocks rendering — useCandidates falls
  // back to the swiper's persisted current_lat/lng from profile.

  if (!current) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="compass-off-outline"
          size={48}
          color={
            theme.colors
              .onSurfaceVariant
          }
        />
        <Spacer
          spacing={
            Spacing.SPACING_PADDING_16
          }
        />
        <AppText
          variant="h3"
          style={{
            color:
              theme.colors.onBackground,
          }}
        >
          No one nearby
        </AppText>
        <Spacer
          spacing={Spacing.SPACING_PADDING_8}
        />
        <AppText
          variant="body"
          style={{
            color:
              theme.colors
                .onSurfaceVariant,
            textAlign: 'center',
          }}
        >
          Check back later for new
          people
        </AppText>
        <Spacer
          spacing={
            Spacing.SPACING_PADDING_24
          }
        />
        <AppButton
          variant="outlined"
          onPress={() => {
            setCurrentIndex(0);
            refetch();
          }}
        >
          Refresh
        </AppButton>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={[
        styles.root,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >
      <View style={styles.cardStack}>
        {next && (
          <View
            style={styles.backCard}
            key={next.user_id}
          >
            <SwipeCard
              candidate={next}
              onSwipeLeft={() => {}}
              onSwipeRight={() => {}}
            />
          </View>
        )}
        <SwipeCard
          key={current.user_id}
          candidate={current}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={
            handleSwipeRight
          }
        />
      </View>

      <View
        style={styles.actionRow}
      >
        <Pressable
          onPress={handleSwipeLeft}
          style={[
            styles.actionBtn,
            styles.actionBtnSmall,
            {
              backgroundColor:
                theme.colors
                  .surfaceVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="close"
            size={28}
            color="#FF3B30"
          />
        </Pressable>

        <Pressable
          onPress={handleSwipeRight}
          style={[
            styles.actionBtn,
            styles.actionBtnLarge,
            {
              backgroundColor:
                theme.colors.primary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="heart"
            size={32}
            color="#fff"
          />
        </Pressable>

      </View>

      <Portal>
        <Modal
          visible={!!matchedUser}
          onDismiss={dismissMatch}
          contentContainerStyle={[
            styles.matchModal,
            {
              backgroundColor:
                theme.colors.surface,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="party-popper"
            size={56}
            color={
              theme.colors.primary
            }
          />
          <Spacer
            spacing={
              Spacing.SPACING_PADDING_16
            }
          />
          <AppText
            variant="h2"
            style={{
              color:
                theme.colors.primary,
              textAlign: 'center',
            }}
          >
            It&apos;s a Match!
          </AppText>
          <Spacer
            spacing={
              Spacing.SPACING_PADDING_8
            }
          />
          <AppText
            variant="body"
            style={{
              color:
                theme.colors
                  .onSurfaceVariant,
              textAlign: 'center',
            }}
          >
            You and{' '}
            {matchedUser?.display_name}{' '}
            liked each other
          </AppText>
          <Spacer
            spacing={
              Spacing.SPACING_PADDING_24
            }
          />
          <AppButton
            variant="primary"
            onPress={dismissMatch}
          >
            Keep Swiping
          </AppButton>
        </Modal>
      </Portal>

      <Snackbar
        visible={swipe.isError}
        onDismiss={() => swipe.reset()}
        duration={3000}
      >
        Swipe didn&apos;t go through —
        check your connection
      </Snackbar>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
  },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop:
      Spacing.SPACING_PADDING_16,
  },
  backCard: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.SPACING_PADDING_24,
    paddingVertical:
      Spacing.SPACING_PADDING_16,
    paddingBottom:
      Spacing.SPACING_PADDING_24,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionBtnSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  actionBtnLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  matchModal: {
    alignItems: 'center',
    padding: Spacing.SPACING_PADDING_32,
    margin: Spacing.SPACING_PADDING_24,
    borderRadius: BorderRadius.xxl,
  },
});
