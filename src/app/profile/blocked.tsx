import React, { useState } from 'react';
import { StyleSheet, View, Image, Pressable, FlatList } from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AmbientGlow from '@shared/components/AmbientGlow';
import Spacer from '@shared/components/Spacer';
import RetryButton from '@shared/components/RetryButton';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import {
  useBlockedUsers,
  useUnblockUser,
  type BlockedUser,
} from '@features/profile/hooks/useBlockedUsers';
import { relativeTime } from '@features/matches/utils/relativeTime';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

// The screen that made blocking reversible.
//
// Until now you could block someone and never undo it — profileViewBlock
// even says "They are not told", which is only defensible if you can also
// change your mind. The RPCs existed; the screen did not.

export default function BlockedUsersScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { data, isPending, isError, error, refetch } = useBlockedUsers();
  const unblock = useUnblockUser();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Which row is mid-request, so only that button spins. One shared
  // pending flag would spin every row at once and tell the user nothing
  // about which unblock is actually happening.
  const [pendingId, setPendingId] = useState<string | null>(null);

  const blocked = data ?? [];

  const blockedOn = (iso: string) => {
    const r = relativeTime(iso);
    const date = r.kind === 'weekday' || r.kind === 'date' ? r.date : null;
    return t(Translations.PROFILE_BLOCKED_ON, {
      date: (date ?? new Date(iso)).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
      }),
    });
  };

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const busy = pendingId === item.user_id;
    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.avatarWrap}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
          {/* Dimmed, not hidden: you should be able to recognise who you
              blocked, but their photo should not sit here looking like a
              profile you can open. */}
          <View
            style={[
              styles.avatarVeil,
              {
                backgroundColor: theme.colors.scrimMid,
              },
            ]}
            pointerEvents="none"
          />
        </View>

        <View style={styles.rowBody}>
          <AppText
            variant="rowTitleQuiet"
            numberOfLines={1}
            style={{
              color: theme.colors.onSurface,
            }}
          >
            {item.display_name ?? ''}
          </AppText>
          <AppText
            variant="caption"
            style={{
              color: theme.colors.onSurfaceFaint,
            }}
          >
            {blockedOn(item.blocked_at)}
          </AppText>
        </View>

        <Pressable
          onPress={() => {
            setPendingId(item.user_id);
            unblock.mutate(item.user_id, {
              onError: err =>
                setErrorMsg(
                  errorMessage(err, Translations.PROFILE_UNBLOCK_ERROR),
                ),
              onSettled: () => setPendingId(null),
            });
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t(Translations.PROFILE_UNBLOCK_NAME, {
            name: item.display_name ?? '',
          })}
          accessibilityState={{ disabled: busy, busy }}
          style={[
            styles.unblock,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator size={16} />
          ) : (
            <AppText
              variant="labelStrong"
              style={{
                color: theme.colors.onSurface,
              }}
            >
              {t(Translations.PROFILE_UNBLOCK)}
            </AppText>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          // The glow bleeds past the status bar, so the screen takes the
          // inset itself rather than sitting inside a padded parent.
          paddingTop: insets.top,
        },
      ]}
    >
      <AmbientGlow />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t(Common.A11Y_BACK)}
          style={styles.back}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={theme.colors.onBackground}
          />
        </Pressable>
        <AppText
          variant="chatTitle"
          style={{
            color: theme.colors.onBackground,
          }}
        >
          {t(Translations.PROFILE_BLOCKED_SHORT)}
        </AppText>
      </View>

      <View style={styles.intro}>
        <AppText
          variant="display"
          style={{
            color: theme.colors.onBackground,
          }}
        >
          {t(Translations.PROFILE_BLOCKED_TITLE)}
        </AppText>
        <AppText
          variant="body"
          style={[
            styles.introBody,
            {
              color: theme.colors.onSurfaceFaint,
            },
          ]}
        >
          {t(Translations.PROFILE_BLOCKED_BODY)}
        </AppText>
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator animating size="large" />
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
            {errorMessage(error, Translations.PROFILE_BLOCKED_ERROR)}
          </AppText>
          <RetryButton
            label={t(Translations.PROFILE_RETRY)}
            onPress={() => refetch()}
          />
        </View>
      ) : blocked.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="account-check-outline"
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
            {t(Translations.PROFILE_BLOCKED_EMPTY)}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={item => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            // The one thing people get wrong about unblocking, said once,
            // under the list rather than in every row.
            <View
              style={[
                styles.note,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={17}
                color={theme.colors.onSurfaceFaint}
              />
              <AppText
                variant="caption"
                style={[
                  styles.noteText,
                  {
                    color: theme.colors.onSurfaceFaint,
                  },
                ]}
              >
                {t(Translations.PROFILE_UNBLOCK_NOTE)}
              </AppText>
            </View>
          }
        />
      )}

      <Snackbar
        visible={!!errorMsg}
        onDismiss={() => setErrorMsg(null)}
        duration={4000}
      >
        {errorMsg ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: Layout.CHAT_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  back: {
    width: Layout.TAB_SEGMENT_HEIGHT,
    height: Layout.TAB_SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    paddingHorizontal: Layout.SCREEN_PADDING,
    paddingTop: Spacing.xs + 2,
  },
  introBody: {
    marginTop: Spacing.xs + 2,
  },
  list: {
    paddingHorizontal: Layout.SCREEN_PADDING,
    paddingTop: Layout.SECTION_GAP,
    paddingBottom: Spacing.xxl,
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
  avatarWrap: {
    width: Layout.AVATAR_ROW - 4,
    height: Layout.AVATAR_ROW - 4,
    borderRadius: (Layout.AVATAR_ROW - 4) / 2,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarVeil: {
    ...StyleSheet.absoluteFillObject,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  unblock: {
    height: Layout.PILL_HEIGHT,
    paddingHorizontal: Layout.FIELD_PADDING_H - 1,
    borderRadius: Layout.PILL_HEIGHT / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm + 2,
    marginTop: Spacing.xs + 2,
    padding: Layout.CARD_PADDING + 1,
    borderRadius: BorderRadius.md + 2,
  },
  noteText: {
    flex: 1,
    lineHeight: 18,
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
});
