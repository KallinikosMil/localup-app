import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Portal, Modal, Snackbar } from 'react-native-paper';
import AppIcon from '@shared/components/AppIcon';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import GradientButton from '@shared/components/GradientButton';
import YesMark from '@shared/components/YesMark';
import Spacer from '@shared/components/Spacer';
import RetryButton from '@shared/components/RetryButton';
import SwipeCard from '@features/discover/components/SwipeCard';
import DeckEmptyState from '@features/discover/components/DeckEmptyState';
import { classifyEmptyDeck } from '@features/discover/utils/deckEmpty';
import {
  PREF_DEFAULTS,
  useDistanceSummary,
  useMatchPreferences,
  useUpdateMatchPreferences,
} from '@features/discover/hooks/useMatchPreferences';
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

// Was false while the button had nowhere to go: match_preferences was read
// on every deck build and written by nothing, so a filters control would
// have been a lie. /filters exists now.
const FILTERS_ENABLED = true;

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

  // Only ever read to EXPLAIN an empty deck, never to build one — the
  // server applies these itself. `prefs.data` is undefined for the first
  // frames, and the defaults are exactly what the server falls back to,
  // so standing in for it is honest rather than a guess.
  const savedPrefs = useMatchPreferences();
  const updatePrefs = useUpdateMatchPreferences();
  const prefs = savedPrefs.data ?? PREF_DEFAULTS;
  const spread = useDistanceSummary(prefs.minAge, prefs.maxAge);
  const emptyState = classifyEmptyDeck({
    summary: spread.isPending ? undefined : spread.data,
    currentKm: prefs.maxDistanceKm,
    minAge: prefs.minAge,
    maxAge: prefs.maxAge,
  });

  // Read through a ref: the callback below is created fresh each render
  // but must not re-create the mutation, and it needs whatever deck is
  // current when the swipe RESOLVES, not when it was fired.
  const candidatesRef = useRef<Candidate[] | undefined>(undefined);
  const swipe = useSwipe(targetId => {
    const who = candidatesRef.current?.find(
      (c: Candidate) => c.user_id === targetId,
    );
    if (who) setMatchedUser(who);
  });

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

  // The cursor carries the pack it belongs to. Resetting it in an effect
  // meant the render that delivered a new deck still had the OLD index
  // (= the previous pack's full length), so `deckConsumed` computed true
  // and the exhaustion effect fired a SECOND refetch on every refill —
  // whose late response then rewound the deck and re-showed candidates the
  // user had just swiped. Derived, it is correct in the same render.
  const [cursor, setCursor] = useState({ index: 0, packId: 0 });
  const currentIndex = cursor.packId === dataUpdatedAt ? cursor.index : 0;
  const advance = useCallback(
    (to: number | ((from: number) => number)) =>
      setCursor(c => {
        const from = c.packId === dataUpdatedAt ? c.index : 0;
        return {
          index: typeof to === 'function' ? to(from) : to,
          packId: dataUpdatedAt,
        };
      }),
    [dataUpdatedAt],
  );
  const [matchedUser, setMatchedUser] = useState<Candidate | null>(null);
  candidatesRef.current = candidates ?? undefined;

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

  // A re-packed deck is a new context; a failure from the previous one
  // must not be waiting to pop over it.
  useEffect(() => {
    if (swipe.isError) swipe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  const current = candidates?.[currentIndex] ?? null;
  const next = candidates?.[currentIndex + 1] ?? null;

  const handleSwipe = useCallback(
    (action: 'liked' | 'passed') => {
      if (!current) return;

      // No per-call onSuccess: a second swipe overwrites it and detaches
      // the observer from the first mutation, so the first swipe's match
      // never got announced. useSwipe reports it at the mutation level.
      swipe.mutate({
        targetId: current.user_id,
        action,
      });

      advance(prev => prev + 1);
    },
    [current, swipe, advance],
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
      advance(0);
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  }, [refreshLocation, refetch, advance]);

  // W7a: the match celebration must persist until the user explicitly
  // dismisses it. It used to live only in the main return branch, so a
  // deck refetch (e.g. useStaleLocationRefetch firing on GPS drift)
  // that emptied/reindexed the deck would hit an early return
  // (`!current` / `deckConsumed`) and UNMOUNT the Portal → the modal
  // flashed and vanished. Rendering it here, in every branch, decouples
  // it from deck state so nothing but dismissMatch can close it.
  // Same defect the celebration above was hoisted to fix, on the control
  // that reports failure. Swiping the LAST card of a page always pushes
  // currentIndex to the deck length, which makes deckConsumed true — so
  // the screen is on the spinner branch at exactly the moment that
  // swipe's RPC comes back, and the failure had nowhere to render. Worse,
  // the only reset() was this Snackbar's own onDismiss, so isError stayed
  // true and it popped open later over an unrelated card.
  const failureNotice = (
    <Snackbar
      visible={swipe.isError}
      onDismiss={() => swipe.reset()}
      duration={3000}
    >
      {errorMessage(swipe.error, Translations.DISCOVER_SWIPE_ERROR)}
    </Snackbar>
  );

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
        <Spacer spacing={Spacing.lg} />
        <AppText
          variant="h2"
          accessibilityRole="header"
          style={{
            color: theme.colors.primary,
            textAlign: 'center',
          }}
        >
          {t(Translations.DISCOVER_MATCH_TITLE)}
        </AppText>
        <Spacer spacing={Spacing.sm} />
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
        <Spacer spacing={Spacing.xl} />
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
          <AppIcon
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
        {failureNotice}
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
        {failureNotice}
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
          {/* Why it is empty decides what to say. "Check back later" was
              the only answer this ever gave, and for someone whose own
              filters had emptied the deck it was the wrong one. */}
          <DeckEmptyState
            state={emptyState}
            prefs={prefs}
            widening={updatePrefs.isPending}
            onWiden={km => updatePrefs.mutate({ ...prefs, maxDistanceKm: km })}
            onOpenFilters={() => router.push('/filters')}
            onRefresh={handleRefresh}
          />
        </ScrollView>
        {celebration}
        {failureNotice}
      </>
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
            <AppIcon
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
              onPress={() => router.push('/filters')}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.DISCOVER_FILTERS)}
              hitSlop={Layout.HIT_SLOP}
              style={[
                styles.headerBtn,
                {
                  backgroundColor: theme.colors.headerPill,
                  borderColor: theme.colors.headerPillBorder,
                },
                theme.dark ? null : styles.headerPillShadow,
              ]}
            >
              <AppIcon
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
          <AppIcon name="close" size={24} color={theme.colors.onPassButton} />
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
      {failureNotice}
    </View>
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
