import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  Pressable,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import useLocation from '@shared/hooks/useLocation';
import {
  useProfile,
  useUpdateProfile,
  usePhotos,
  useUploadPhoto,
  useDeletePhoto,
  computeMode,
  type ProfileMode,
} from '@features/profile/hooks/useProfile';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';

const AVATAR_SIZE = 112;
const PHOTO_SIZE = 100;
const MAX_PHOTOS = 6;
const BIO_LIMIT = 240;

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: photos } = usePhotos(profile?.user_id);
  const updateProfile = useUpdateProfile();
  const uploadPhoto = useUploadPhoto();
  const deletePhoto = useDeletePhoto();
  const { latitude, longitude } = useLocation();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? '');
    setCity(profile.home_city ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  const mode = computeMode(
    profile,
    profile?.current_lat ?? latitude,
    profile?.current_lng ?? longitude,
  );

  const handleSave = () => {
    updateProfile.mutate(
      {
        display_name: name.trim(),
        home_city: city.trim(),
        bio: bio.trim(),
      },
      {
        onSuccess: () => router.back(),
      },
    );
  };

  const handleCancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  const markDirty = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  const setMode = (next: ProfileMode | null) => {
    updateProfile.mutate({
      mode_override: next,
    });
  };

  const setHomeHere = () => {
    if (latitude == null || longitude == null) {
      Alert.alert(
        'Location unavailable',
        'Enable location permission to set your home location.',
      );
      return;
    }
    updateProfile.mutate({
      home_lat: latitude,
      home_lng: longitude,
    });
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo library access to add photos.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    uploadPhoto.mutate({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete photo?', 'This will permanently remove this photo.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePhoto.mutate(id),
      },
    ]);
  };

  const photoCount = photos?.length ?? 0;
  const canAddPhoto = photoCount < MAX_PHOTOS;

  if (isLoading || !profile) {
    return (
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
    );
  }

  const surfaceLow = blendSurface(
    theme.colors.background,
    theme.colors.primaryContainer,
    0.18,
  );
  const surfaceLowest = theme.colors.surface;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Glass-style top bar */}
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: surfaceLow,
          },
        ]}
      >
        <Pressable
          onPress={handleCancel}
          hitSlop={12}
          style={[
            styles.pillGhost,
            {
              backgroundColor: surfaceLow,
            },
          ]}
        >
          <AppText
            variant="body"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '500',
            }}
          >
            Cancel
          </AppText>
        </Pressable>

        <AppText
          variant="h3"
          style={{
            color: theme.colors.onBackground,
          }}
        >
          Edit Profile
        </AppText>

        <Pressable
          onPress={handleSave}
          disabled={updateProfile.isPending}
          hitSlop={12}
          style={[
            styles.pillPrimary,
            {
              backgroundColor: theme.colors.primary,
              opacity: updateProfile.isPending ? 0.5 : 1,
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
            {updateProfile.isPending ? 'Saving…' : 'Save'}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {profile.avatar_url ? (
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
                  backgroundColor: surfaceLow,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={56}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
        </View>

        <Spacer spacing={Spacing.SPACING_PADDING_24} />

        {/* Basic info card */}
        <Section title="Basics" bg={surfaceLowest}>
          <FieldRow
            icon="account-outline"
            value={name}
            onChange={markDirty(setName)}
            placeholder="Name"
            theme={theme}
          />
          <Divider />
          <FieldRow
            icon="map-marker-outline"
            value={city}
            onChange={markDirty(setCity)}
            placeholder="Home city"
            theme={theme}
          />
        </Section>

        <Spacer spacing={Spacing.SPACING_PADDING_16} />

        {/* About */}
        <Section title="About you" bg={surfaceLowest}>
          <RNTextInput
            value={bio}
            onChangeText={markDirty(setBio)}
            maxLength={BIO_LIMIT}
            multiline
            placeholder="Share what makes you, you."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={[
              styles.bioInput,
              {
                color: theme.colors.onSurface,
              },
            ]}
          />
          <AppText
            variant="caption"
            style={{
              alignSelf: 'flex-end',
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {bio.length} / {BIO_LIMIT}
          </AppText>
        </Section>

        <Spacer spacing={Spacing.SPACING_PADDING_16} />

        {/* Photos */}
        <Section title="Your gallery" bg={surfaceLowest}>
          <View style={styles.photoGrid}>
            {(photos ?? []).map(p => (
              <Pressable
                key={p.id}
                onLongPress={() => confirmDelete(p.id)}
                style={[
                  styles.photoCell,
                  {
                    backgroundColor: surfaceLow,
                  },
                ]}
              >
                <Image source={{ uri: p.url }} style={styles.photoImg} />
              </Pressable>
            ))}
            {canAddPhoto && (
              <Pressable
                onPress={pickPhoto}
                disabled={uploadPhoto.isPending}
                style={[
                  styles.photoCell,
                  styles.photoAdd,
                  {
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                {uploadPhoto.isPending ? (
                  <ActivityIndicator animating size="small" />
                ) : (
                  <MaterialCommunityIcons
                    name="plus"
                    size={32}
                    color={theme.colors.primary}
                  />
                )}
              </Pressable>
            )}
          </View>
          <Spacer spacing={Spacing.SPACING_PADDING_8} />
          <AppText
            variant="caption"
            style={{
              color: theme.colors.onSurfaceVariant,
              fontStyle: 'italic',
            }}
          >
            Long press to remove
          </AppText>
        </Section>

        <Spacer spacing={Spacing.SPACING_PADDING_16} />

        {/* Home base */}
        <Section title="Home base" bg={surfaceLowest}>
          <View style={styles.homeBaseRow}>
            <View
              style={[
                styles.mapThumb,
                {
                  backgroundColor: surfaceLow,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={28}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                variant="body"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: '600',
                }}
              >
                {profile.home_city ?? 'Not set'}
              </AppText>
              <AppText
                variant="caption"
                style={{
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                {profile.home_lat != null
                  ? `${profile.home_lat.toFixed(3)}, ${profile.home_lng?.toFixed(3)}`
                  : 'No coordinates yet'}
              </AppText>
            </View>
          </View>
          <Spacer spacing={Spacing.SPACING_PADDING_12} />
          <Pressable
            onPress={setHomeHere}
            style={[
              styles.pillPrimary,
              {
                backgroundColor: theme.colors.primary,
                alignSelf: 'flex-start',
              },
            ]}
          >
            <MaterialCommunityIcons
              name="home-map-marker"
              size={16}
              color={theme.colors.onPrimary}
            />
            <AppText
              variant="caption"
              style={{
                color: theme.colors.onPrimary,
                fontWeight: '600',
                marginLeft: 6,
              }}
            >
              Set this as my home
            </AppText>
          </Pressable>
        </Section>

        <Spacer spacing={Spacing.SPACING_PADDING_16} />

        {/* Mode */}
        <Section title="Mode" bg={surfaceLowest}>
          <View style={styles.modeRow}>
            <ModePill
              label="Auto"
              active={profile.mode_override === null}
              onPress={() => setMode(null)}
              theme={theme}
              surface={surfaceLow}
            />
            <ModePill
              label="Local"
              active={profile.mode_override === 'local'}
              onPress={() => setMode('local')}
              theme={theme}
              surface={surfaceLow}
            />
            <ModePill
              label="Traveler"
              active={profile.mode_override === 'traveler'}
              onPress={() => setMode('traveler')}
              theme={theme}
              surface={surfaceLow}
            />
          </View>
          <Spacer spacing={Spacing.SPACING_PADDING_8} />
          <AppText
            variant="caption"
            style={{
              color: theme.colors.onSurface,
            }}
          >
            Currently shown as{' '}
            <AppText
              variant="caption"
              style={{
                fontWeight: '700',
                color: theme.colors.primary,
              }}
            >
              {mode === 'traveler' ? 'Traveler' : 'Local'}
            </AppText>
            {profile.mode_override === null
              ? ' — based on your home base.'
              : ' — manual override active.'}
          </AppText>
        </Section>

        <Spacer spacing={Spacing.SPACING_PADDING_32} />
      </ScrollView>
    </View>
  );
}

// ─── helpers ─────────────────────────

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
          color: theme.colors.onSurfaceVariant,
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
      <View style={[styles.sectionCard, { backgroundColor: bg }]}>
        {children}
      </View>
    </View>
  );
};

const FieldRow = ({
  icon,
  value,
  onChange,
  placeholder,
  theme,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  theme: ReturnType<typeof useTheme>;
}) => (
  <View style={styles.fieldRow}>
    <MaterialCommunityIcons
      name={icon}
      size={20}
      color={theme.colors.onSurfaceVariant}
    />
    <RNTextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      style={[styles.fieldInput, { color: theme.colors.onSurface }]}
    />
  </View>
);

const Divider = () => {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.outlineVariant ?? 'rgba(0,0,0,0.05)',
        marginLeft: 36,
        opacity: 0.4,
      }}
    />
  );
};

const ModePill = ({
  label,
  active,
  onPress,
  theme,
  surface,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  surface: string;
}) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.modePill,
      {
        backgroundColor: active ? theme.colors.primary : surface,
      },
    ]}
  >
    <AppText
      variant="caption"
      style={{
        color: active ? theme.colors.onPrimary : theme.colors.onSurface,
        fontWeight: active ? '700' : '500',
      }}
    >
      {label}
    </AppText>
  </Pressable>
);

// Lerp between two hex colors. Used to
// derive surface tiers from the theme.
const blendSurface = (base: string, tint: string, t: number) => {
  const b = hexToRgb(base);
  const tt = hexToRgb(tint);
  if (!b || !tt) return base;
  const r = Math.round(b.r + (tt.r - b.r) * t);
  const g = Math.round(b.g + (tt.g - b.g) * t);
  const bl = Math.round(b.b + (tt.b - b.b) * t);
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
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.SPACING_PADDING_16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pillGhost: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
  },
  pillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
  },
  content: {
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingTop: Spacing.SPACING_PADDING_24,
    paddingBottom: Spacing.SPACING_PADDING_32,
  },
  avatarWrap: {
    alignItems: 'center',
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
  sectionCard: {
    padding: Spacing.SPACING_PADDING_16,
    borderRadius: BorderRadius.xxl,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  bioInput: {
    minHeight: 96,
    fontSize: 16,
    textAlignVertical: 'top',
    padding: 0,
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
  photoAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  homeBaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapThumb: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
  },
});
