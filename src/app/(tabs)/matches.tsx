import React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import {
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from
  '@shared/components/AppText';
import Spacer from
  '@shared/components/Spacer';
import {
  useMatches,
  type Match,
} from
  '@features/matches/hooks/useMatches';
import { Spacing } from
  '@theme/constants/Spacing';
import { BorderRadius } from
  '@theme/constants/BorderRadius';

const AVATAR_SIZE = 56;

export default function MatchesScreen() {
  const theme = useTheme();
  const {
    data: matches,
    isLoading,
    refetch,
  } = useMatches();

  const renderItem = ({
    item,
  }: {
    item: Match;
  }) => (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor:
            theme.colors.surface,
          borderColor:
            theme.colors.outlineVariant,
        },
      ]}
      onPress={() => {
        // TODO: navigate to chat
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
              backgroundColor:
                theme.colors
                  .surfaceVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="account"
            size={28}
            color={
              theme.colors
                .onSurfaceVariant
            }
          />
        </View>
      )}

      <View style={styles.info}>
        <AppText
          variant="body"
          style={{
            color:
              theme.colors.onSurface,
            fontWeight: '600',
          }}
        >
          {item.display_name}
        </AppText>
        {item.home_city && (
          <AppText
            variant="caption"
            style={{
              color:
                theme.colors
                  .onSurfaceVariant,
            }}
          >
            {item.home_city}
          </AppText>
        )}
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={
          theme.colors
            .onSurfaceVariant
        }
      />
    </Pressable>
  );

  if (isLoading) {
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

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >
      <View style={styles.header}>
        <AppText
          variant="h2"
          style={{
            color:
              theme.colors.onBackground,
          }}
        >
          Matches
        </AppText>
      </View>

      {!matches?.length ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons
            name="heart-outline"
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
                theme.colors
                  .onBackground,
            }}
          >
            No matches yet
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
            Start swiping to find
            people who share your
            interests
          </AppText>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item =>
            item.id
          }
          renderItem={renderItem}
          contentContainerStyle={
            styles.list
          }
          onRefresh={refetch}
          refreshing={isLoading}
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
  },
  header: {
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
    paddingTop:
      Spacing.SPACING_PADDING_24,
    paddingBottom:
      Spacing.SPACING_PADDING_16,
  },
  list: {
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
    paddingBottom:
      Spacing.SPACING_PADDING_32,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding:
      Spacing.SPACING_PADDING_16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom:
      Spacing.SPACING_PADDING_8,
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
    marginLeft:
      Spacing.SPACING_PADDING_16,
  },
});
