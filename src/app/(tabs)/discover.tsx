import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Portal, Modal, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import EmptyState from '@shared/components/EmptyState';
import GradientButton from '@shared/components/GradientButton';
import YesMark from '@shared/components/YesMark';
import Spacer from '@shared/components/Spacer';
import RetryButton from '@shared/components/RetryButton';
import SwipeCard from '@features/discover/components/SwipeCard';
import { formatDistance } from '@features/discover/utils/format';
import useLocation from '@shared/hooks/useLocation';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import {
  useCandidates,
  useStaleLocationRefetch,
  useSwipe,
  type Candidate,
} from '@features/discover/hooks/useDiscover';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/discover/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

const FILTERS_ENABLED = false;

export default function DiscoverScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  // GPS is background refinement only — the deck is computed
  // from the swiper's persisted location server-side, and the
  // 5km-drift hook refetches if a fresh fix lands far away.
  // Never gate the render on it (P0 fix 2026-06-10).
  const { latitude, longitude, refresh: refreshLocation } = useLocation();
  useStaleLocationRefetch(latitude, longitude);
  const {
    data: candidates,
    // RQ v5: `isLoading === isPending && isFetching`, so a query that
    // is still DISABLED (prefs in flight) reports isLoading === false →
    // the empty state flashed on every cold open. `isPending` is true
    // while disabled, so gate the spinner on that instead (H2).
    isPending,
    isError,
    error,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useCandidates();
  const swipe = useSwipe();

  // Everything floating over the bottom of the photo, so the card knows
  // how much of its own text would otherwise sit behind the buttons.
  const chromeHeight =
    insets.bottom +
    Spacing.lg +
    Layout.TAB_BAR_HEIGHT +
    Layout.ACTION_GAP +
    Layout.ACTION_ROW_HEIGHT +
    Layout.ACTION_GAP;
  const errorMessage = useErrorMessage();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedUser, setMatchedUser] = useState<Candidate | null>(null);

  // Reassure the user after a few seconds of loading — a Supabase
  // project waking from auto-pause can take 10-20s. Same hint as
  // Matches/Chat.
  const [slowLoading, setSlowLoading] = useState(false);
  useEffect(() => {
    if (!isPending) {
      setSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => setSlowLoading(true), 4500);
    return () => clearTimeout(timer);
  }, [isPending]);

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
    !!candidates && candidates.length > 0 && currentIndex >= candidates.length;

  // H2: `!isError` is load-bearing. RQ keeps the previous data on a
  // failed refetch, so `deckConsumed` stays true — without this gate a
  // failing refetch flipped `isFetching`, changed the deps, and fired
  // another refetch, unbounded, pinned on the spinner branch with no
  // way out. On error we stop and hand the user the Retry branch.
  useEffect(() => {
    if (deckConsumed && !isFetching && !isError) {
      refetch();
    }
  }, [deckConsumed, isFetching, isError, refetch]);

  const current = candidates?.[currentIndex] ?? null;
  const next = candidates?.[currentIndex + 1] ?? null;

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

  const handleSwipeRight = useCallback(() => {
    handleSwipe('liked');
  }, [handleSwipe]);

  const handleSwipeLeft = useCallback(() => {
    handleSwipe('passed');
  }, [handleSwipe]);

  const dismissMatch = () => {
    setMatchedUser(null);
  };

  // Manual refresh: force a fresh GPS fix, then re-pack the deck.
  //
  // V16: this used to be driven by a refresh icon in the header, because
  // pull-to-refresh "conflicts with the card pan gesture". It doesn't
  // have to — the conflict was that SwipeCard's Pan had no activation
  // criteria, so it swallowed vertical drags too. Constraining it to
  // horizontal movement (`activeOffsetX`, see SwipeCard) leaves the
  // vertical drag to the ScrollView, so the deck itself pulls to refresh
  // and the header icon is gone.
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try {
      await refreshLocation();
      setCurrentIndex(0);
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  }, [refreshLocation, refetch]);

  // W7a: the match celebration must persist until the user explicitly
  // dismisses it. It used to live only in the main return branch, so a
  // deck refetch (e.g. useStaleLocationRefetch firing on GPS drift)
  // that emptied/reindexed the deck would hit an early return
  // (`!current` / `deckConsumed`) and UNMOUNT the Portal → the modal
  // flashed and vanished. Rendering it here, in every branch, decouples
  // it from deck state so nothing but dismissMatch can close it.
  const celebration = (
    <Portal>
      <Modal
        visible={!!matchedUser}
        onDismiss={dismissMatch}
        contentContainerStyle={[
          styles.matchModal,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <YesMark size={30} color={theme.colors.primary} />
        <Spacer spacing={Spacing.SPACING_PADDING_16} />
        <AppText
          variant="h2"
          style={{
            color: theme.colors.primary,
            textAlign: 'center',
          }}
        >
          {t(Translations.DISCOVER_MATCH_TITLE)}
        </AppText>
        <Spacer spacing={Spacing.SPACING_PADDING_8} />
        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
          }}
        >
          {t(Translations.DISCOVER_MATCH_BODY, {
            name: matchedUser?.display_name ?? '',
          })}
        </AppText>
        <Spacer spacing={Spacing.SPACING_PADDING_24} />
        <AppButton variant="primary" onPress={dismissMatch}>
          {t(Translations.DISCOVER_MATCH_CTA)}
        </AppButton>
      </Modal>
    </Portal>
  );

  // H2: a backend failure must never present as "No one nearby" — the
  // single worst lie in this app. This branch sits BEFORE the empty
  // state, and before the spinner (which `deckConsumed` would otherwise
  // pin forever once a refetch starts failing). Gating on `!current`
  // keeps a failed background refetch from yanking a deck the user is
  // mid-way through; the error surfaces the moment no card is left.
  if (isError && !current) {
    return (
      <>
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
              marginTop: Spacing.sm,
            }}
          >
            {errorMessage(error, Translations.DISCOVER_ERROR)}
          </AppText>
          <RetryButton
            label={t(Translations.DISCOVER_RETRY)}
            onPress={() => refetch()}
          />
        </View>
        {celebration}
      </>
    );
  }

  if (isPending || deckConsumed) {
    return (
      <>
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
                marginTop: Spacing.lg,
              }}
            >
              {t(Translations.DISCOVER_WAKING)}
            </AppText>
          ) : null}
        </View>
        {celebration}
      </>
    );
  }

  // Note: locError no longer blocks rendering — useCandidates falls
  // back to the swiper's persisted current_lat/lng from profile.

  if (!current) {
    return (
      <>
        <ScrollView
          style={{
            backgroundColor: theme.colors.background,
          }}
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl
              refreshing={manualRefreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          <EmptyState
            icon="compass-off-outline"
            title={t(Translations.DISCOVER_EMPTY_TITLE)}
            subtitle={t(Translations.DISCOVER_EMPTY_SUBTITLE)}
            action={{
              label: t(Translations.DISCOVER_REFRESH),
              onPress: handleRefresh,
            }}
          />
        </ScrollView>
        {celebration}
      </>
    );
  }

  return (
    <GestureHandlerRootView
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {/* The deck rides in a ScrollView purely to carry the
          RefreshControl — the content is exactly one screen tall
          (flexGrow, no overflow), so it never actually scrolls. The pull
          gesture and the card's pan gesture no longer fight: the card
          only claims a drag once it's 12px HORIZONTAL (activeOffsetX in
          SwipeCard), which a downward pull never is. */}
      <ScrollView
        style={styles.deckScroll}
        contentContainerStyle={styles.deckContent}
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.cardStack}>
          {next ? (
            <View style={styles.backCard} key={next.user_id}>
              <SwipeCard
                candidate={next}
                bottomInset={chromeHeight}
                onSwipeLeft={() => {}}
                onSwipeRight={() => {}}
              />
            </View>
          ) : null}
          <SwipeCard
            key={current.user_id}
            candidate={current}
            bottomInset={chromeHeight}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        </View>
      </ScrollView>

      {/* Shell picks the bar style from the THEME, which is right for a
          screen with a themed background and wrong for this one: in light
          mode it asked for dark icons, and they then sat on somebody's
          photo. The top scrim exists precisely so the clock and the
          battery stay readable, and it only darkens — so the icons are
          light here regardless of theme.
          Gated on FOCUS, not mount: tab screens stay mounted when you
          switch away, so an unconditional StatusBar left white icons on
          the white Profile screen, where they were invisible. */}
      {isFocused ? <StatusBar barStyle="light-content" /> : null}

      {/* Header and actions float OVER the photo now — they are screen
          chrome, so they must not travel with the card as it is dragged
          away. `box-none` on the containers keeps the swipe gesture
          reachable in the gaps between them. */}
      <View
        style={[
          styles.header,
          {
            top: insets.top + Layout.HEADER_TOP_OFFSET,
          },
        ]}
        pointerEvents="box-none"
      >
        <AppText
          variant="wordmark"
          style={{
            color: theme.colors.ON_PHOTO,
          }}
        >
          {t(Translations.DISCOVER_TITLE)}
        </AppText>

        <View style={styles.headerActions}>
          <View
            style={[
              styles.headerPill,
              {
                backgroundColor: theme.colors.headerPill,
                borderColor: theme.colors.headerPillBorder,
              },
              theme.dark ? null : styles.headerPillShadow,
            ]}
          >
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={13}
              color={theme.colors.onHeaderPill}
            />
            <AppText
              variant="microStrong"
              style={[
                styles.headerPillText,
                {
                  color: theme.colors.onHeaderPill,
                },
              ]}
            >
              {formatDistance(current.distance_km, t)}
            </AppText>
          </View>

          {FILTERS_ENABLED ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(Translations.DISCOVER_FILTERS)}
              style={[
                styles.headerBtn,
                {
                  backgroundColor: theme.colors.headerPill,
                  borderColor: theme.colors.headerPillBorder,
                },
                theme.dark ? null : styles.headerPillShadow,
              ]}
            >
              <MaterialCommunityIcons
                name="tune-variant"
                size={17}
                color={theme.colors.onHeaderPillIcon}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.actionRow,
          {
            bottom:
              insets.bottom +
              Spacing.lg +
              Layout.TAB_BAR_HEIGHT +
              Layout.ACTION_GAP,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handleSwipeLeft}
          accessibilityRole="button"
          accessibilityLabel={t(Common.A11Y_PASS)}
          style={({ pressed }) => [
            styles.passBtn,
            {
              backgroundColor: theme.colors.passButton,
              borderColor: theme.colors.passButtonBorder,
            },
            theme.dark ? null : styles.passBtnShadow,
            pressed && {
              transform: [{ scale: 0.96 }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={theme.colors.onPassButton}
          />
        </Pressable>

        <GradientButton
          onPress={handleSwipeRight}
          circleSize={Layout.ACTION_YES_SIZE}
          accessibilityLabel={t(Common.A11Y_LIKE)}
        >
          {/* The pin, solid, inside the gradient — see YesMark. No
              marginTop nudge: unlike the heart glyph, the pin is drawn
              centred in its own 24x24 viewBox. */}
          <YesMark size={34} color={theme.colors.onGradient} />
        </GradientButton>
      </View>

      {celebration}

      <Snackbar
        visible={swipe.isError}
        onDismiss={() => swipe.reset()}
        duration={3000}
      >
        {errorMessage(swipe.error, Translations.DISCOVER_SWIPE_ERROR)}
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
    paddingHorizontal: Spacing.xl,
  },
  // Absolute, because the header floats over the photo rather than
  // sitting above it. `top` comes from the safe-area inset at the call
  // site — the design's 66px assumes one particular status bar.
  header: {
    position: 'absolute',
    left: Layout.SCREEN_PADDING,
    right: Layout.SCREEN_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.PROGRESS_BAR_GAP,
    height: Layout.PILL_HEIGHT,
    paddingHorizontal: Layout.PILL_PADDING_H,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  headerPillText: {
    fontVariant: ['tabular-nums'],
  },
  headerPillShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  headerBtn: {
    width: Layout.ICON_BUTTON_SM,
    height: Layout.ICON_BUTTON_SM,
    borderRadius: Layout.ICON_BUTTON_SM / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  deckScroll: {
    flex: 1,
  },
  // flexGrow (not flex) so the deck fills the viewport exactly: no
  // overflow to scroll, but still a scroll container for the pull (V16).
  deckContent: {
    flexGrow: 1,
  },
  // No padding and no centring any more: the cards are full-bleed and
  // position themselves, so the stack is just the space they live in.
  cardStack: {
    flex: 1,
  },
  backCard: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
  actionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Layout.BADGE_MD,
  },
  passBtn: {
    width: Layout.ACTION_PASS_SIZE,
    height: Layout.ACTION_PASS_SIZE,
    borderRadius: Layout.ACTION_PASS_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passBtnShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
  },
  matchModal: {
    alignItems: 'center',
    padding: Spacing.xxl,
    margin: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
});
