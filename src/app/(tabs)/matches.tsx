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
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { useMatches, type Match } from '@features/matches/hooks/useMatches';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Translations } from '@features/matches/i18n/translationKeys';

const AVATAR_SIZE = 60;

export default function MatchesScreen() {
  const theme = useTheme();
  const router = useRouter();
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

  // After a few seconds of loading, reassure the user it isn't
  // frozen — same as chat (U5). Resets when loading ends.
  const [slowLoading, setSlowLoading] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setSlowLoading(false);
      return;
    }
    const t = setTimeout(() => setSlowLoading(true), 4500);
    return () => clearTimeout(t);
  }, [isLoading]);

  const renderItem = ({ item }: { item: Match }) => (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceVariant,
        },
      ]}
      onPress={() => {
        router.push({
          pathname: '/chat/[matchId]',
          params: {
            matchId: item.id,
            name: item.display_name,
            // Hand the chat the thread it
            // already knows → skips the
            // thread lookup (§1b).
            ...(item.thread_id
              ? {
                  threadId: item.thread_id,
                }
              : {}),
          },
        });
      }}
    >
      {item.avatar_url ? (
        <Image
          source={{
            uri: item.avatar_url,
          }}
          style={styles.avatar}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.avatarPlaceholder,
            {
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="account"
            size={28}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      )}

      <View style={styles.info}>
        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurface,
            fontWeight: '600',
          }}
        >
          {item.display_name}
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={1}
          style={{
            color: theme.colors.onSurfaceVariant,
            fontStyle: item.last_message ? 'normal' : 'italic',
          }}
        >
          {item.last_message ?? t(Translations.MATCHES_SAY_HELLO)}
        </AppText>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={theme.colors.onSurfaceVariant}
      />
    </Pressable>
  );

  return (
    <View
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
            color: theme.colors.onBackground,
          }}
        >
          {t(Translations.MATCHES_TITLE)}
        </AppText>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator animating size="large" />
          {slowLoading ? (
            <AppText
              variant="body"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                marginTop: Spacing.SPACING_PADDING_16,
              }}
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
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginTop: Spacing.SPACING_PADDING_12,
            }}
          >
            {errorMessage(error, Translations.MATCHES_ERROR)}
          </AppText>
          <Pressable
            onPress={() => refetch()}
            hitSlop={8}
            style={[
              styles.retryBtn,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <AppText
              variant="body"
              style={{
                color: theme.colors.onPrimary,
                fontWeight: '600',
              }}
            >
              {t(Translations.MATCHES_RETRY)}
            </AppText>
          </Pressable>
        </View>
      ) : !matches?.length ? (
        <ScrollView
          contentContainerStyle={styles.empty}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
            />
          }
        >
          <MaterialCommunityIcons
            name="heart-outline"
            size={48}
            color={theme.colors.onSurfaceVariant}
          />
          <Spacer spacing={Spacing.SPACING_PADDING_16} />
          <AppText
            variant="h3"
            style={{
              color: theme.colors.onBackground,
            }}
          >
            {t(Translations.MATCHES_EMPTY_TITLE)}
          </AppText>
          <Spacer spacing={Spacing.SPACING_PADDING_8} />
          <AppText
            variant="body"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
            }}
          >
            {t(Translations.MATCHES_EMPTY_SUBTITLE)}
          </AppText>
        </ScrollView>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
        />
      )}
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
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
  retryBtn: {
    marginTop: Spacing.SPACING_PADDING_16,
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingVertical: Spacing.SPACING_PADDING_8,
    borderRadius: BorderRadius.pill,
  },
  header: {
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingTop: Spacing.SPACING_PADDING_24,
    paddingBottom: Spacing.SPACING_PADDING_16,
  },
  list: {
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingBottom: Spacing.SPACING_PADDING_32,
  },
  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.SPACING_PADDING_16,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.SPACING_PADDING_16,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.SPACING_PADDING_16,
  },
});
