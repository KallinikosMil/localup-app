import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, Portal, Modal, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import EmptyState from '@shared/components/EmptyState';
import GradientButton from '@shared/components/GradientButton';
import Spacer from '@shared/components/Spacer';
import { useAppTheme } from '@theme/paper';
import useLocation from '@shared/hooks/useLocation';
import SwipeCard from '@features/discover/components/SwipeCard';
import {
  useCandidates,
  useStaleLocationRefetch,
  useSwipe,
  type Candidate,
} from '@features/discover/hooks/useDiscover';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Translations } from '@features/discover/i18n/translationKeys';

// Placeholder for the sibling discovery-filters spec —
// the header filter button renders only when this flips.
const FILTERS_ENABLED = false;

export default function DiscoverScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  // GPS is background refinement only — the deck is computed
  // from the swiper's persisted location server-side, and the
  // 5km-drift hook refetches if a fresh fix lands far away.
  // Never gate the render on it (P0 fix 2026-06-10).
  const { latitude, longitude, refresh: refreshLocation } = useLocation();
  useStaleLocationRefetch(latitude, longitude);
  const {
    data: candidates,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useCandidates();
  const swipe = useSwipe();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedUser, setMatchedUser] = useState<Candidate | null>(null);

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

  useEffect(() => {
    if (deckConsumed && !isFetching) {
      refetch();
    }
  }, [deckConsumed, isFetching, refetch]);

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

  // Manual refresh (header icon / empty-state
  // pull): force a fresh GPS fix, then re-pack
  // the deck. No pull-to-refresh on the deck
  // itself — it conflicts with the card pan
  // gesture.
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
        <MaterialCommunityIcons
          name="party-popper"
          size={56}
          color={theme.colors.primary}
        />
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

  if (isLoading || deckConsumed) {
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
      <View style={styles.header}>
        <AppText
          variant="h2"
          style={{
            color: theme.colors.primary,
          }}
        >
          {t(Translations.DISCOVER_TITLE)}
        </AppText>
        <View style={styles.headerActions}>
          {FILTERS_ENABLED ? (
            <Pressable
              style={[
                styles.headerBtn,
                {
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="tune-variant"
                size={20}
                color={theme.colors.onSurface}
              />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleRefresh}
            disabled={manualRefreshing}
            style={[
              styles.headerBtn,
              {
                borderColor: theme.colors.outline,
              },
            ]}
          >
            {manualRefreshing ? (
              <ActivityIndicator animating size={20} />
            ) : (
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={theme.colors.onSurface}
              />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.cardStack}>
        {next ? (
          <View style={styles.backCard} key={next.user_id}>
            <SwipeCard
              candidate={next}
              onSwipeLeft={() => {}}
              onSwipeRight={() => {}}
            />
          </View>
        ) : null}
        <SwipeCard
          key={current.user_id}
          candidate={current}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
        />
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={handleSwipeLeft}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionBtnSmall,
            {
              backgroundColor: theme.colors.surfaceElevated,
            },
            pressed && {
              transform: [{ scale: 0.96 }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="close"
            size={28}
            color={theme.colors.pass}
          />
        </Pressable>

        <GradientButton onPress={handleSwipeRight} circleSize={68}>
          <MaterialCommunityIcons
            name="heart"
            size={32}
            color={theme.colors.onPrimary}
            // optical centering — the
            // heart glyph sits high in
            // its em box
            style={{ marginTop: 2 }}
          />
        </GradientButton>
      </View>

      {celebration}

      <Snackbar
        visible={swipe.isError}
        onDismiss={() => swipe.reset()}
        duration={3000}
      >
        {t(Translations.DISCOVER_SWIPE_ERROR)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
  },
  backCard: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
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
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  matchModal: {
    alignItems: 'center',
    padding: Spacing.xxl,
    margin: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
});
