import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import AppText from '@shared/components/AppText';
import AmbientGlow from '@shared/components/AmbientGlow';
import Spacer from '@shared/components/Spacer';
import RetryButton from '@shared/components/RetryButton';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { useMatches, type Match } from '@features/matches/hooks/useMatches';
import { useUnreadMatches } from '@features/matches/hooks/useReadTracking';
import { relativeTime } from '@features/matches/utils/relativeTime';
import { useAppTheme, type AppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/matches/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

// The util decides the SHAPE of the answer; the words live here, so Greek
// is not stuck with English abbreviations. The weekday and date cases go
// through toLocaleDateString, which knows every language's short day
// names better than a lookup table would.
const timeLabel = (iso: string | null, t: TFunction) => {
  const r = relativeTime(iso);
  switch (r.kind) {
    case 'none':
      return '';
    case 'now':
      return t(Translations.MATCHES_TIME_NOW);
    case 'minutes':
      return t(Translations.MATCHES_TIME_MINUTES, { count: r.value });
    case 'hours':
      return t(Translations.MATCHES_TIME_HOURS, { count: r.value });
    case 'yesterday':
      return t(Translations.MATCHES_TIME_YESTERDAY);
    case 'weekday':
      return r.date.toLocaleDateString(undefined, { weekday: 'short' });
    case 'date':
      return r.date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      });
  }
};

// A match nobody has written in yet. NOT the same thing as unread: this
// one has no conversation at all, so the design gives it its own chip and
// a "Say hello" prompt instead of a message preview.
const isNewMatch = (m: Match) => !m.last_message;

// The small tinted counter beside a section label.
const CountPill = ({ label, theme }: { label: string; theme: AppTheme }) => (
  <View
    style={[
      styles.countPill,
      {
        backgroundColor: theme.colors.countPill,
        borderColor: theme.colors.countPillBorder,
      },
    ]}
  >
    <AppText
      variant="nano"
      style={{
        color: theme.colors.primary,
      }}
    >
      {label}
    </AppText>
  </View>
);

const SectionLabel = ({
  title,
  count,
  theme,
}: {
  title: string;
  count: string | null;
  theme: AppTheme;
}) => (
  <View style={styles.sectionRow}>
    <AppText
      variant="overline"
      style={{
        color: theme.colors.onSurfaceFaint,
      }}
    >
      {title}
    </AppText>
    {count ? <CountPill label={count} theme={theme} /> : null}
  </View>
);

function MatchesScreenContent() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const {
    data: matches,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useMatches();
  const { isUnread } = useUnreadMatches();

  // After a few seconds of loading, reassure the user it isn't frozen —
  // same as chat (U5). Resets when loading ends.
  const [slowLoading, setSlowLoading] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => setSlowLoading(true), 4500);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const all = matches ?? [];
  const fresh = all.filter(isNewMatch);
  const unreadCount = all.filter(isUnread).length;

  const openChat = (item: Match) =>
    router.push({
      pathname: '/chat/[matchId]',
      params: {
        matchId: item.id,
        name: item.display_name,
        // Lets the chat header open this person's profile without another
        // lookup. Optional there — a deep link won't carry it, and the
        // header simply isn't tappable in that case.
        userId: item.user_id,
        ...(item.avatar_url ? { avatar: item.avatar_url } : {}),
        // Hand the chat the thread it already knows → skips the thread
        // lookup (§1b).
        ...(item.thread_id ? { threadId: item.thread_id } : {}),
      },
    });

  const openProfile = (item: Match) =>
    router.push({
      pathname: '/profile/[userId]',
      params: {
        userId: item.user_id,
        matchId: item.id,
        name: item.display_name,
      },
    });

  const Avatar = ({ item, size }: { item: Match; size: number }) =>
    item.avatar_url ? (
      <Image
        source={{
          uri: item.avatar_url,
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    ) : (
      <View
        style={[
          styles.avatarPlaceholder,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="account"
          size={size / 2}
          color={theme.colors.onSurfaceVariant}
        />
      </View>
    );

  // The strip of matches nobody has written in yet. A gradient ring marks
  // the ones still unseen — the same ring the chat avatar uses, so "there
  // is something here for you" means one thing across the app.
  const NewMatchesStrip = () => (
    <View style={styles.stripBlock}>
      <SectionLabel
        title={t(Translations.MATCHES_SECTION_NEW)}
        count={
          fresh.length > 0
            ? t(Translations.MATCHES_COUNT_NEW, { count: fresh.length })
            : null
        }
        theme={theme}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {fresh.map(item => {
          const unseen = isUnread(item);
          const face = (
            <View
              style={[
                styles.ringInner,
                {
                  borderColor: theme.colors.background,
                },
              ]}
            >
              <Avatar
                item={item}
                size={
                  Layout.AVATAR_STRIP -
                  (Layout.AVATAR_RING_WIDTH + Layout.AVATAR_RING_GAP) * 2
                }
              />
            </View>
          );

          return (
            <Pressable
              key={item.id}
              onPress={() => openChat(item)}
              accessibilityRole="button"
              accessibilityLabel={item.display_name}
              accessibilityState={{ selected: unseen }}
              style={styles.stripItem}
            >
              <View style={styles.ringWrap}>
                {unseen ? (
                  <LinearGradient
                    colors={[
                      theme.colors.gradientStart,
                      theme.colors.gradientEnd,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ring}
                  >
                    {face}
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      styles.ring,
                      {
                        backgroundColor: theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    {face}
                  </View>
                )}
                {unseen ? (
                  <View
                    style={[
                      styles.unseenDot,
                      {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.background,
                      },
                    ]}
                  />
                ) : null}
              </View>
              <AppText
                variant={unseen ? 'microStrong' : 'micro'}
                numberOfLines={1}
                style={{
                  color: unseen
                    ? theme.colors.onSurface
                    : theme.colors.onSurfaceFaint,
                }}
              >
                {item.display_name}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }: { item: Match }) => {
    const unread = isUnread(item);
    const brandNew = isNewMatch(item);
    const modeChip =
      item.match_mode === 'traveler'
        ? {
            bg: theme.colors.modeTravelerOnPhoto,
            label: t(Common.COMMON_MODE_TRAVELER),
          }
        : item.match_mode === 'local'
          ? {
              bg: theme.colors.modeLocalOnPhoto,
              label: t(Common.COMMON_MODE_LOCAL),
            }
          : null;

    return (
      <Pressable
        // The row is one destination, so it is announced as one item. The
        // unread state is a tint and a heavier weight — neither of which a
        // reader can see, hence the explicit state.
        accessibilityRole="button"
        accessibilityLabel={item.display_name ?? ''}
        accessibilityState={{ selected: unread }}
        style={[
          styles.row,
          {
            backgroundColor: unread
              ? theme.colors.surfaceSelected
              : theme.colors.surfaceElevated,
            borderColor: unread
              ? theme.colors.outlineSelected
              : theme.colors.outlineVariant,
          },
        ]}
        onPress={() => openChat(item)}
      >
        {/* The avatar opens the person's profile; the rest of the row
            opens the chat. Two destinations in one row, so the smaller,
            clearly-bounded target gets the secondary action. */}
        <Pressable
          onPress={() => openProfile(item)}
          accessibilityRole="button"
          accessibilityLabel={item.display_name ?? ''}
          accessibilityHint={t(Common.A11Y_OPEN_PROFILE)}
          hitSlop={4}
        >
          <Avatar item={item} size={Layout.AVATAR_ROW} />
        </Pressable>

        <View style={styles.rowBody}>
          <View style={styles.nameRow}>
            <AppText
              variant={unread ? 'rowTitle' : 'rowTitleQuiet'}
              numberOfLines={1}
              style={[
                styles.name,
                {
                  color: unread
                    ? theme.colors.onSurface
                    : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {item.display_name}
            </AppText>

            {brandNew ? (
              <View
                style={[
                  styles.tinyChip,
                  {
                    backgroundColor: theme.colors.countPill,
                    borderColor: theme.colors.countPillBorder,
                  },
                ]}
              >
                <AppText
                  variant="nano"
                  style={{
                    color: theme.colors.primary,
                  }}
                >
                  {t(Translations.MATCHES_NEW_MATCH)}
                </AppText>
              </View>
            ) : modeChip ? (
              <View
                style={[
                  styles.tinyChip,
                  styles.tinyChipSolid,
                  {
                    backgroundColor: modeChip.bg,
                  },
                ]}
              >
                <AppText
                  variant="nano"
                  style={{
                    color: theme.colors.ON_PHOTO,
                  }}
                >
                  {modeChip.label}
                </AppText>
              </View>
            ) : null}
          </View>

          <AppText
            variant={unread || brandNew ? 'bodySmallStrong' : 'bodySmall'}
            numberOfLines={1}
            style={{
              color: brandNew
                ? theme.colors.primary
                : unread
                  ? theme.colors.onSurface
                  : theme.colors.onSurfaceFaint,
            }}
          >
            {item.last_message ?? t(Translations.MATCHES_SAY_HELLO)}
          </AppText>
        </View>

        <View style={styles.rowMeta}>
          <AppText
            variant={unread ? 'microStrong' : 'micro'}
            style={{
              color: unread
                ? theme.colors.primary
                : theme.colors.onSurfaceFaint,
            }}
          >
            {timeLabel(item.last_message_at ?? item.created_at, t)}
          </AppText>

          {item.unread_count > 0 ? (
            <View style={styles.unreadBadge}>
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <AppText
                variant="microStrong"
                style={{
                  color: theme.colors.onGradient,
                }}
              >
                {String(item.unread_count)}
              </AppText>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <AmbientGlow />

      <View style={styles.header}>
        <AppText
          variant="display"
          style={{
            color: theme.colors.onBackground,
          }}
        >
          {t(Translations.MATCHES_TITLE)}
        </AppText>
        {all.length > 0 ? (
          <View style={styles.totalBadge}>
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <AppText
              variant="labelStrong"
              style={{
                color: theme.colors.onGradient,
              }}
            >
              {String(all.length)}
            </AppText>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.center}>
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
              {t(Translations.MATCHES_WAKING)}
            </AppText>
          ) : null}
        </View>
      ) : isError ? (
        <View style={styles.center}>
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
            {errorMessage(error, Translations.MATCHES_ERROR)}
          </AppText>
          <RetryButton
            label={t(Translations.MATCHES_RETRY)}
            onPress={() => refetch()}
          />
        </View>
      ) : all.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.empty}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
            />
          }
        >
          {/* The pin, outlined and beside text — the LABEL form of the
              mark (see YesMark). Never a heart. */}
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={48}
            color={theme.colors.onSurfaceFaint}
          />
          <Spacer spacing={Spacing.lg} />
          <AppText
            variant="h3"
            style={{
              color: theme.colors.onBackground,
            }}
          >
            {t(Translations.MATCHES_EMPTY_TITLE)}
          </AppText>
          <Spacer spacing={Spacing.sm} />
          <AppText
            variant="body"
            style={[
              styles.centerNote,
              {
                color: theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {t(Translations.MATCHES_EMPTY_SUBTITLE)}
          </AppText>
        </ScrollView>
      ) : (
        <FlatList
          data={all}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {fresh.length > 0 ? <NewMatchesStrip /> : null}
              <SectionLabel
                title={t(Translations.MATCHES_SECTION_MESSAGES)}
                count={
                  unreadCount > 0
                    ? t(Translations.MATCHES_COUNT_UNREAD, {
                        count: unreadCount,
                      })
                    : null
                }
                theme={theme}
              />
            </>
          }
          contentContainerStyle={[
            styles.list,
            {
              // The tab bar floats over the list and takes no layout space.
              paddingBottom:
                insets.bottom + Spacing.lg + Layout.TAB_BAR_HEIGHT + Spacing.lg,
            },
          ]}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
        />
      )}
    </View>
  );
}

// No ScreenSafeArea: the ambient glow has to bleed past the status bar,
// so the screen takes the top inset itself and the list reserves room for
// the floating tab bar.
export default function MatchesScreen() {
  return <MatchesScreenContent />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Layout.SCREEN_PADDING,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  totalBadge: {
    minWidth: Layout.BADGE_MD,
    height: Layout.BADGE_MD,
    borderRadius: Layout.BADGE_MD / 2,
    paddingHorizontal: Layout.BADGE_PADDING_MD,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Layout.TINY_CHIP_PADDING_V,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  stripBlock: {
    marginBottom: Layout.SECTION_GAP,
  },
  strip: {
    gap: Layout.STRIP_GAP,
    paddingTop: Spacing.md,
  },
  stripItem: {
    alignItems: 'center',
    gap: Spacing.xs + 2,
    width: Layout.AVATAR_STRIP,
  },
  ringWrap: {
    width: Layout.AVATAR_STRIP,
    height: Layout.AVATAR_STRIP,
  },
  ring: {
    width: Layout.AVATAR_STRIP,
    height: Layout.AVATAR_STRIP,
    borderRadius: Layout.AVATAR_STRIP / 2,
    padding: Layout.AVATAR_RING_WIDTH,
  },
  ringInner: {
    flex: 1,
    borderRadius: (Layout.AVATAR_STRIP - Layout.AVATAR_RING_WIDTH * 2) / 2,
    borderWidth: Layout.AVATAR_RING_GAP,
    overflow: 'hidden',
  },
  unseenDot: {
    position: 'absolute',
    right: -Layout.AVATAR_RING_GAP,
    top: -Layout.AVATAR_RING_GAP,
    width: Layout.DOT_SIZE,
    height: Layout.DOT_SIZE,
    borderRadius: Layout.DOT_SIZE / 2,
    borderWidth: Layout.AVATAR_RING_WIDTH,
  },
  list: {
    paddingHorizontal: Layout.SCREEN_PADDING,
    gap: Layout.LIST_GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.CARD_INNER_GAP,
    padding: Layout.CARD_PADDING,
    borderRadius: Layout.CARD_RADIUS,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: Layout.TINY_CHIP_PADDING_V + 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.CHIP_GAP,
  },
  name: {
    flexShrink: 1,
  },
  tinyChip: {
    paddingHorizontal: Layout.TINY_CHIP_PADDING_H,
    paddingVertical: Layout.TINY_CHIP_PADDING_V,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  tinyChipSolid: {
    borderWidth: 0,
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: Spacing.xs + 2,
  },
  unreadBadge: {
    minWidth: Layout.BADGE_SM,
    height: Layout.BADGE_SM,
    borderRadius: Layout.BADGE_SM / 2,
    paddingHorizontal: Layout.BADGE_PADDING_SM,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
