import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

import AppText from '@shared/components/AppText';
import AmbientGlow from '@shared/components/AmbientGlow';
import Spacer from '@shared/components/Spacer';
import CustomModal from '@shared/components/CustomModal';
import AppButton from '@shared/components/AppButton';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { useLogout } from '@features/auth/hooks/useAuth';
import { useDeleteAccount } from '@features/auth/hooks/useDeleteAccount';
import { ModeSegments } from '@features/profile/components/EditField';
import { useBlockedUsers } from '@features/profile/hooks/useBlockedUsers';
import { useAppTheme, type AppTheme } from '@theme/paper';
import { useThemeMode } from '@theme/ThemeModeProvider';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

// Everything that was homeless, in one room.
//
// Three separate things pointed here before this screen existed. The gear
// on the Profile hero was drawn from the first pass and led nowhere.
// Blocked people had a screen but its only door was a text link wedged
// between the theme control and Log out. And Appearance, Log out and
// Delete account were all sitting inline at the bottom of Profile, which
// is a page about *you* — not a page about the app.
//
// They are NOT left in both places. Two log-out affordances is how a
// person ends up hunting for the one that works.

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const SectionLabel = ({
  theme,
  children,
}: {
  theme: AppTheme;
  children: string;
}) => (
  <AppText variant="overline" style={{ color: theme.colors.onSurfaceFaint }}>
    {children}
  </AppText>
);

const Hint = ({ theme, children }: { theme: AppTheme; children: string }) => (
  <AppText
    variant="caption"
    style={[styles.hint, { color: theme.colors.onSurfaceFaint }]}
  >
    {children}
  </AppText>
);

// One row shape for all three, because they are one kind of thing: a
// label, an optional count, and a tap. `danger` only swaps the palette —
// Delete account is not a different control, it is the same control
// pointed somewhere you cannot come back from.
const SettingsRow = ({
  theme,
  icon,
  label,
  value,
  chevron,
  danger,
  busy,
  onPress,
  accessibilityHint,
}: {
  theme: AppTheme;
  icon: IconName;
  label: string;
  value?: string;
  chevron?: boolean;
  danger?: boolean;
  busy?: boolean;
  onPress: () => void;
  accessibilityHint?: string;
}) => {
  const tint = danger ? theme.colors.error : theme.colors.onSurfaceVariant;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!busy }}
      style={[
        styles.row,
        {
          backgroundColor: danger
            ? theme.colors.errorContainer
            : theme.colors.surfaceElevated,
          borderColor: danger
            ? theme.colors.errorOutline
            : theme.colors.outlineVariant,
        },
      ]}
    >
      <MaterialCommunityIcons
        importantForAccessibility="no"
        accessibilityElementsHidden
        name={icon}
        size={20}
        color={tint}
      />
      <AppText
        variant="message"
        style={[
          styles.rowLabel,
          { color: danger ? theme.colors.error : theme.colors.onSurface },
        ]}
      >
        {label}
      </AppText>
      {busy ? <ActivityIndicator size={16} /> : null}
      {value ? (
        <AppText variant="body" style={{ color: theme.colors.onSurfaceFaint }}>
          {value}
        </AppText>
      ) : null}
      {chevron ? (
        <MaterialCommunityIcons
          importantForAccessibility="no"
          accessibilityElementsHidden
          name="chevron-right"
          size={18}
          color={theme.colors.onSurfaceFaint}
        />
      ) : null}
    </Pressable>
  );
};

export default function SettingsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const blocked = useBlockedUsers();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // The designer drew only the "system" case. The other two need a line
  // too — the control is three-way and a sentence that appears for one
  // option reads as a warning about that option.
  const effect =
    themeMode === 'light'
      ? Translations.PROFILE_THEME_ALWAYS_LIGHT
      : themeMode === 'dark'
        ? Translations.PROFILE_THEME_ALWAYS_DARK
        : theme.dark
          ? Translations.PROFILE_THEME_FOLLOWING_DARK
          : Translations.PROFILE_THEME_FOLLOWING_LIGHT;

  // No count until the list has actually arrived. A "0" while the query
  // is in flight is not a placeholder, it is a wrong answer — and the one
  // number on this screen that a person might act on.
  const blockedCount = blocked.data ? String(blocked.data.length) : undefined;

  const onLogout = () =>
    logout.mutate(undefined, {
      onError: err =>
        setErrorMsg(errorMessage(err, Translations.PROFILE_LOGOUT_ERROR)),
    });

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          // The glow bleeds past the status bar, so the screen takes the
          // inset itself rather than sitting inside a padded parent —
          // same as /profile/blocked, which this screen opens.
          paddingTop: insets.top,
        },
      ]}
    >
      <AmbientGlow size={Layout.GLOW_SIZE_LG} x={-70} y={-150} />

      <View
        style={[
          styles.header,
          { borderBottomColor: theme.colors.outlineVariant },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t(Common.A11Y_BACK)}
          style={styles.headerSide}
        >
          <MaterialCommunityIcons
            importantForAccessibility="no"
            accessibilityElementsHidden
            name="chevron-left"
            size={24}
            color={theme.colors.onBackground}
          />
        </Pressable>

        <AppText
          variant="chatTitle"
          accessibilityRole="header"
          style={{ color: theme.colors.onBackground }}
        >
          {t(Translations.PROFILE_SETTINGS)}
        </AppText>

        {/* Balances the back button so the title is centred, not
            centred-ish. */}
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <SectionLabel theme={theme}>
          {t(Translations.PROFILE_APPEARANCE)}
        </SectionLabel>
        <View style={styles.control}>
          <ModeSegments
            theme={theme}
            options={[
              {
                label: t(Translations.PROFILE_THEME_SYSTEM),
                icon: 'cellphone',
                active: themeMode === 'system',
                onPress: () => setThemeMode('system'),
              },
              {
                label: t(Translations.PROFILE_THEME_LIGHT),
                icon: 'white-balance-sunny',
                active: themeMode === 'light',
                onPress: () => setThemeMode('light'),
              },
              {
                label: t(Translations.PROFILE_THEME_DARK),
                icon: 'moon-waning-crescent',
                active: themeMode === 'dark',
                onPress: () => setThemeMode('dark'),
              },
            ]}
          />
        </View>
        <Hint theme={theme}>{t(effect)}</Hint>

        <View
          style={[
            styles.divider,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        />

        <SectionLabel theme={theme}>
          {t(Translations.PROFILE_SECTION_PRIVACY)}
        </SectionLabel>
        <View style={styles.control}>
          <SettingsRow
            theme={theme}
            icon="account-cancel-outline"
            label={t(Translations.PROFILE_BLOCKED_TITLE)}
            value={blockedCount}
            chevron
            onPress={() => router.push('/profile/blocked')}
          />
        </View>
        <Hint theme={theme}>{t(Translations.PROFILE_BLOCKED_HINT)}</Hint>

        <View
          style={[
            styles.divider,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        />

        <SectionLabel theme={theme}>
          {t(Translations.PROFILE_SECTION_ACCOUNT)}
        </SectionLabel>
        <View style={styles.control}>
          <SettingsRow
            theme={theme}
            icon="logout"
            label={t(Translations.PROFILE_LOGOUT)}
            busy={logout.isPending}
            onPress={onLogout}
          />
        </View>
        <View style={styles.rowGap}>
          <SettingsRow
            theme={theme}
            icon="trash-can-outline"
            label={t(Translations.PROFILE_DELETE_ACCOUNT)}
            accessibilityHint={t(Translations.PROFILE_DELETE_BODY)}
            danger
            busy={deleteAccount.isPending}
            onPress={() => setConfirmDelete(true)}
          />
        </View>

        <View style={styles.spacer} />

        <AppText
          variant="micro"
          style={[styles.version, { color: theme.colors.onSurfaceFaint }]}
        >
          {t(Translations.PROFILE_APP_VERSION, {
            // Read, never typed in: a hardcoded number here would go
            // stale on the first release and nobody would notice.
            version: Constants.expoConfig?.version ?? '',
          })}
        </AppText>
      </ScrollView>

      <CustomModal
        visible={confirmDelete}
        onDismiss={() => setConfirmDelete(false)}
      >
        <AppText
          variant="h3"
          style={[styles.modalText, { color: theme.colors.onSurface }]}
        >
          {t(Translations.PROFILE_DELETE_TITLE)}
        </AppText>
        <Spacer spacing={Spacing.sm} />
        <AppText
          variant="body"
          style={[styles.modalText, { color: theme.colors.onSurfaceVariant }]}
        >
          {t(Translations.PROFILE_DELETE_BODY)}
        </AppText>
        <Spacer spacing={Spacing.xl} />
        {/* The safe choice is the prominent one. The destructive choice is
            reachable but never the default. */}
        <AppButton variant="primary" onPress={() => setConfirmDelete(false)}>
          {t(Translations.PROFILE_DELETE_CANCEL)}
        </AppButton>
        <Spacer spacing={Spacing.md} />
        <AppButton
          variant="link"
          onPress={() => {
            setConfirmDelete(false);
            deleteAccount.mutate(undefined, {
              onError: err =>
                setErrorMsg(
                  errorMessage(err, Translations.PROFILE_DELETE_ERROR),
                ),
            });
          }}
          labelStyle={{ color: theme.colors.error }}
        >
          {t(Translations.PROFILE_DELETE_CONFIRM)}
        </AppButton>
      </CustomModal>

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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerSide: {
    width: Layout.TAB_SEGMENT_HEIGHT,
    height: Layout.TAB_SEGMENT_HEIGHT,
    justifyContent: 'center',
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: Layout.SCREEN_PADDING,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl + 2,
  },
  control: {
    marginTop: Spacing.md,
  },
  hint: {
    marginTop: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Layout.SECTION_GAP + 2,
  },
  row: {
    height: Layout.SETTINGS_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 1,
    paddingHorizontal: Spacing.lg - 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
  },
  rowGap: {
    marginTop: Spacing.sm + 2,
  },
  // Pins the version to the bottom on a short screen instead of letting
  // it hang under Delete account.
  spacer: {
    flex: 1,
    minHeight: Spacing.xl,
  },
  version: {
    textAlign: 'center',
  },
  modalText: {
    textAlign: 'center',
  },
});
