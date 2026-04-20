import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
} from 'react-native';
import {
  useTheme,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from
  '@shared/components/AppText';
import AppButton from
  '@shared/components/AppButton';
import Spacer from
  '@shared/components/Spacer';
import { useLogout } from
  '@features/auth/hooks/useAuth';
import { useProfile } from
  '@features/profile/hooks/useProfile';
import { Spacing } from
  '@theme/constants/Spacing';
import { BorderRadius } from
  '@theme/constants/BorderRadius';

const AVATAR_SIZE = 96;

export default function ProfileScreen() {
  const theme = useTheme();
  const logout = useLogout();
  const { data: profile, isLoading } =
    useProfile();

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
    <ScrollView
      style={[
        styles.root,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
      contentContainerStyle={
        styles.content
      }
    >
      <View style={styles.header}>
        <AppText
          variant="h2"
          style={{
            color:
              theme.colors.onBackground,
          }}
        >
          Profile
        </AppText>
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {profile?.avatar_url ? (
          <Image
            source={{
              uri: profile.avatar_url,
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
              size={48}
              color={
                theme.colors
                  .onSurfaceVariant
              }
            />
          </View>
        )}
      </View>

      {/* Name */}
      <AppText
        variant="h2"
        style={{
          color:
            theme.colors.onBackground,
          textAlign: 'center',
        }}
      >
        {profile?.display_name ?? '—'}
      </AppText>

      {/* City */}
      {profile?.home_city && (
        <View style={styles.cityRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={16}
            color={
              theme.colors
                .onSurfaceVariant
            }
          />
          <AppText
            variant="caption"
            style={{
              color:
                theme.colors
                  .onSurfaceVariant,
              marginLeft: 4,
            }}
          >
            {profile.home_city}
          </AppText>
        </View>
      )}

      <Spacer
        spacing={
          Spacing.SPACING_PADDING_16
        }
      />

      {/* Bio */}
      {profile?.bio && (
        <View
          style={[
            styles.section,
            {
              backgroundColor:
                theme.colors.surface,
              borderColor:
                theme.colors
                  .outlineVariant,
            },
          ]}
        >
          <AppText
            variant="caption"
            style={{
              color:
                theme.colors
                  .onSurfaceVariant,
              marginBottom: 4,
            }}
          >
            About
          </AppText>
          <AppText
            variant="body"
            style={{
              color:
                theme.colors.onSurface,
            }}
          >
            {profile.bio}
          </AppText>
        </View>
      )}

      <Spacer
        spacing={
          Spacing.SPACING_PADDING_8
        }
      />

      {/* Interests */}
      {profile?.interests &&
        profile.interests.length > 0 && (
          <View
            style={[
              styles.section,
              {
                backgroundColor:
                  theme.colors.surface,
                borderColor:
                  theme.colors
                    .outlineVariant,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={{
                color:
                  theme.colors
                    .onSurfaceVariant,
                marginBottom: 8,
              }}
            >
              Interests
            </AppText>
            <View style={styles.chips}>
              {profile.interests.map(
                interest => (
                  <Chip
                    key={interest}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          theme.colors
                            .surfaceVariant,
                      },
                    ]}
                    textStyle={{
                      color:
                        theme.colors
                          .onSurfaceVariant,
                    }}
                  >
                    {interest}
                  </Chip>
                ),
              )}
            </View>
          </View>
        )}

      <Spacer
        spacing={
          Spacing.SPACING_PADDING_32
        }
      />

      <AppButton
        variant="outlined"
        onPress={() => logout.mutate()}
        loading={logout.isPending}
        disabled={logout.isPending}
      >
        Logout
      </AppButton>

      <Spacer
        spacing={
          Spacing.SPACING_PADDING_32
        }
      />
    </ScrollView>
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
  content: {
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
  },
  header: {
    paddingTop:
      Spacing.SPACING_PADDING_24,
    paddingBottom:
      Spacing.SPACING_PADDING_16,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom:
      Spacing.SPACING_PADDING_16,
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
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  section: {
    padding:
      Spacing.SPACING_PADDING_16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: BorderRadius.pill,
  },
});
