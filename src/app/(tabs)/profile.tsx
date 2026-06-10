import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  useTheme,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from
  '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AppText from
  '@shared/components/AppText';
import AppButton from
  '@shared/components/AppButton';
import Spacer from
  '@shared/components/Spacer';
import useLocation from
  '@shared/hooks/useLocation';
import { useLogout } from
  '@features/auth/hooks/useAuth';
import {
  useProfile,
  usePhotos,
  computeMode,
} from
  '@features/profile/hooks/useProfile';
import { Spacing } from
  '@theme/constants/Spacing';
import { BorderRadius } from
  '@theme/constants/BorderRadius';

const AVATAR_SIZE = 112;
const PHOTO_SIZE = 96;

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const logout = useLogout();
  const {
    data: profile,
    isLoading,
    refetch: refetchProfile,
    isRefetching: profileRefetching,
  } = useProfile();
  const {
    data: photos,
    refetch: refetchPhotos,
    isRefetching: photosRefetching,
  } = usePhotos(profile?.user_id);

  const handleRefresh = async () => {
    await Promise.all([
      refetchProfile(),
      refetchPhotos(),
    ]);
  };
  const { latitude, longitude } =
    useLocation();

  const mode = computeMode(
    profile,
    profile?.current_lat ?? latitude,
    profile?.current_lng ?? longitude,
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

  const surfaceLow = blendSurface(
    theme.colors.background,
    theme.colors.primaryContainer,
    0.18,
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor:
          theme.colors.background,
      }}
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={
            profileRefetching ||
            photosRefetching
          }
          onRefresh={handleRefresh}
        />
      }
    >
      {/* Header */}
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
        <Pressable
          onPress={() =>
            router.push('/profile/edit')
          }
          hitSlop={12}
          style={[
            styles.editPill,
            {
              backgroundColor:
                theme.colors.primary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={14}
            color={
              theme.colors.onPrimary
            }
          />
          <AppText
            variant="caption"
            style={{
              color:
                theme.colors.onPrimary,
              fontWeight: '700',
              marginLeft: 6,
            }}
          >
            Edit
          </AppText>
        </Pressable>
      </View>

      {/* Avatar + identity */}
      <View style={styles.identity}>
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
                  surfaceLow,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="account"
              size={56}
              color={
                theme.colors
                  .onSurfaceVariant
              }
            />
          </View>
        )}
        <Spacer
          spacing={Spacing.SPACING_PADDING_12}
        />
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
        {profile?.home_city && (
          <View style={styles.cityRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={14}
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
          spacing={Spacing.SPACING_PADDING_8}
        />
        {/* Mode badge */}
        <View
          style={[
            styles.modeBadge,
            {
              backgroundColor:
                theme.colors
                  .primaryContainer,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={
              mode === 'traveler'
                ? 'airplane'
                : 'home-variant-outline'
            }
            size={14}
            color={
              theme.colors
                .onPrimaryContainer
            }
          />
          <AppText
            variant="caption"
            style={{
              color:
                theme.colors
                  .onPrimaryContainer,
              fontWeight: '700',
              marginLeft: 6,
              letterSpacing: 0.5,
            }}
          >
            {mode === 'traveler'
              ? 'TRAVELER'
              : 'LOCAL'}
          </AppText>
        </View>
      </View>

      <Spacer
        spacing={Spacing.SPACING_PADDING_24}
      />

      {/* About */}
      <Section
        title="About"
        bg={theme.colors.surface}
      >
        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurface,
            lineHeight: 22,
          }}
        >
          {profile?.bio?.trim() ||
            'Tell people a bit about yourself — tap Edit to add a bio.'}
        </AppText>
      </Section>

      {/* Photos */}
      {photos && photos.length > 0 && (
        <>
          <Spacer
            spacing={Spacing.SPACING_PADDING_16}
          />
          <Section
            title="Gallery"
            bg={theme.colors.surface}
          >
            <View
              style={styles.photoGrid}
            >
              {photos.map(p => (
                <View
                  key={p.id}
                  style={[
                    styles.photoCell,
                    {
                      backgroundColor:
                        surfaceLow,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: p.url }}
                    style={
                      styles.photoImg
                    }
                  />
                </View>
              ))}
            </View>
          </Section>
        </>
      )}

      {/* Interests */}
      {profile?.interests &&
        profile.interests.length > 0 && (
          <>
            <Spacer
              spacing={Spacing.SPACING_PADDING_16}
            />
            <Section
              title="Interests"
              bg={theme.colors.surface}
            >
              <View style={styles.chips}>
                {profile.interests.map(
                  interest => (
                    <Chip
                      key={interest}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            surfaceLow,
                        },
                      ]}
                      textStyle={{
                        color:
                          theme.colors
                            .onSurface,
                      }}
                    >
                      {interest}
                    </Chip>
                  ),
                )}
              </View>
            </Section>
          </>
        )}

      <Spacer
        spacing={Spacing.SPACING_PADDING_32}
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
        spacing={Spacing.SPACING_PADDING_32}
      />
    </ScrollView>
  );
}

const Section = ({
  title,
  bg,
  children,
}: {
  title: string;
  bg: string;
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  return (
    <View>
      <AppText
        variant="caption"
        style={{
          color:
            theme.colors.onSurfaceVariant,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          fontSize: 11,
          marginBottom: 8,
          marginLeft: 4,
          fontWeight: '600',
        }}
      >
        {title}
      </AppText>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: bg },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const blendSurface = (
  base: string,
  tint: string,
  t: number,
) => {
  const b = hexToRgb(base);
  const tt = hexToRgb(tint);
  if (!b || !tt) return base;
  const r = Math.round(
    b.r + (tt.r - b.r) * t,
  );
  const g = Math.round(
    b.g + (tt.g - b.g) * t,
  );
  const bl = Math.round(
    b.b + (tt.b - b.b) * t,
  );
  return `rgb(${r}, ${g}, ${bl})`;
};

const hexToRgb = (hex: string) => {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
    paddingTop:
      Spacing.SPACING_PADDING_24,
    paddingBottom:
      Spacing.SPACING_PADDING_32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
  },
  identity: {
    alignItems: 'center',
    marginTop: Spacing.SPACING_PADDING_16,
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
    marginTop: 4,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  sectionCard: {
    padding:
      Spacing.SPACING_PADDING_16,
    borderRadius: BorderRadius.xxl,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
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
