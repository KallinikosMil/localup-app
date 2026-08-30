import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AmbientGlow from '@shared/components/AmbientGlow';
import InterestChip from '@shared/components/InterestChip';
import RetryButton from '@shared/components/RetryButton';
import ScreenSafeArea from '@shared/components/ScreenSafeArea';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import {
  groupByCategory,
  useInterestCatalogue,
  useMyInterests,
  useUpdateInterests,
} from '@features/profile/hooks/useInterests';
import {
  INTEREST_MAX,
  canSaveInterests,
  interestsChanged,
  interestsStillNeeded,
  toggleInterest,
} from '@features/profile/utils/interestSelection';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/profile/i18n/translationKeys';

// Changing your interests, which was impossible until now: they were picked
// once inside onboarding and nothing could ever touch them again.
//
// Its own screen rather than a section inside Edit profile, and the reason
// is the 3-5 rule. Inline, dropping to two would disable the Save for the
// WHOLE form while someone was editing their bio, and the cause would be
// several hundred pixels further down. A rule that blocks a save should not
// block a form it has nothing to do with.
export default function EditInterestsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();

  const catalogue = useInterestCatalogue();
  const mine = useMyInterests();
  const update = useUpdateInterests();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[] | null>(null);
  // Seeded once the saved set arrives, and only once: re-seeding on every
  // change of `mine` would throw away edits the moment the query refetched.
  useEffect(() => {
    if (selected === null && mine.data) setSelected(mine.data);
  }, [mine.data, selected]);

  const picked = selected ?? [];
  const atMax = picked.length >= INTEREST_MAX;
  const needed = interestsStillNeeded(picked);
  const dirty = mine.data ? interestsChanged(mine.data, picked) : false;
  const canSave = canSaveInterests(picked) && dirty && !update.isPending;

  const grouped = useMemo(
    () => groupByCategory(catalogue.data ?? []),
    [catalogue.data],
  );

  const onSave = () => {
    update.mutate(picked, {
      onSuccess: () => router.back(),
      onError: err =>
        setErrorMsg(
          errorMessage(err, Translations.PROFILE_INTERESTS_SAVE_ERROR),
        ),
    });
  };

  // The counter says one of three things, and which one it says IS the
  // feedback: how many you have, how many more you need, or that you are
  // full. A disabled Save with no sentence beside it is a dead end.
  const status = !canSaveInterests(picked)
    ? t(Translations.PROFILE_INTERESTS_NEED_MORE, { count: needed })
    : atMax
      ? t(Translations.PROFILE_INTERESTS_AT_MAX)
      : t(Translations.PROFILE_INTERESTS_RANGE);

  const hint = !canSaveInterests(picked)
    ? t(Translations.PROFILE_INTERESTS_MIN_HINT)
    : atMax
      ? t(Translations.PROFILE_INTERESTS_MAX_HINT)
      : null;

  const loading = catalogue.isPending || mine.isPending;
  const failed = catalogue.isError || mine.isError;

  return (
    <ScreenSafeArea>
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
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
            hitSlop={Layout.HIT_SLOP}
            style={styles.headerSide}
          >
            <AppText
              variant="message"
              style={{ color: theme.colors.onSurfaceFaint }}
            >
              {t(Translations.PROFILE_CANCEL)}
            </AppText>
          </Pressable>

          <AppText
            variant="chatTitle"
            style={{ color: theme.colors.onBackground }}
          >
            {t(Translations.PROFILE_INTERESTS_TITLE)}
          </AppText>

          <View style={[styles.headerSide, styles.headerRight]}>
            <Pressable
              onPress={onSave}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              accessibilityLabel={t(Translations.PROFILE_SAVE)}
              hitSlop={Layout.HIT_SLOP}
            >
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.save, canSave ? null : styles.saveOff]}
              >
                {update.isPending ? (
                  <ActivityIndicator
                    size={16}
                    color={theme.colors.onGradient}
                  />
                ) : (
                  <AppText
                    variant="bodySmallStrong"
                    style={{ color: theme.colors.onGradient }}
                  >
                    {t(Translations.PROFILE_SAVE)}
                  </AppText>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator animating size="large" />
          </View>
        ) : failed ? (
          <View style={styles.center}>
            <AppText
              variant="body"
              style={[
                styles.centerNote,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {errorMessage(
                catalogue.error ?? mine.error,
                Translations.PROFILE_ERROR,
              )}
            </AppText>
            <RetryButton
              label={t(Translations.PROFILE_RETRY)}
              onPress={() => {
                void catalogue.refetch();
                void mine.refetch();
              }}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <AppText
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t(Translations.PROFILE_INTERESTS_WHY)}
            </AppText>

            <View
              style={[
                styles.counter,
                {
                  backgroundColor: theme.colors.surfaceSelected,
                  borderColor: theme.colors.outlineSelected,
                },
              ]}
            >
              <AppText
                variant="bodySmall"
                style={[styles.counterLeft, { color: theme.colors.onSurface }]}
              >
                {status}
              </AppText>
              <AppText
                variant="bodySmallStrong"
                style={{ color: theme.colors.primary }}
              >
                {t(Translations.PROFILE_INTERESTS_COUNT, {
                  selected: picked.length,
                  max: INTEREST_MAX,
                })}
              </AppText>
            </View>

            {hint ? (
              <AppText
                variant="caption"
                style={[styles.hint, { color: theme.colors.onSurfaceFaint }]}
              >
                {hint}
              </AppText>
            ) : null}

            {grouped.map(([category, items]) => (
              <View key={category}>
                <AppText
                  variant="microStrong"
                  style={[
                    styles.category,
                    { color: theme.colors.onSurfaceFaint },
                  ]}
                >
                  {category.toUpperCase()}
                </AppText>
                <View style={styles.chips}>
                  {items.map(item => {
                    const on = picked.includes(item.id);
                    return (
                      <InterestChip
                        key={item.id}
                        label={item.name}
                        selected={on}
                        // Tapping an unselected chip while full is a no-op by
                        // design — the grid stays a toggle and the hint above
                        // explains it, rather than an alert for every stray tap.
                        onPress={() =>
                          setSelected(prev =>
                            toggleInterest(prev ?? [], item.id),
                          )
                        }
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <Snackbar
          visible={!!errorMsg}
          onDismiss={() => setErrorMsg(null)}
          duration={4000}
        >
          {errorMsg ?? ''}
        </Snackbar>
      </View>
    </ScreenSafeArea>
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
  // Equal sides so the title sits centred regardless of how wide the two
  // controls happen to be in the current language.
  headerSide: {
    width: 76,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  save: {
    height: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOff: {
    opacity: 0.4,
  },
  body: {
    padding: Layout.SCREEN_PADDING,
    paddingBottom: Spacing.xxl,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 3,
    paddingHorizontal: Spacing.md + 2,
    borderRadius: BorderRadius.md + 4,
    borderWidth: 1,
  },
  counterLeft: {
    flex: 1,
    minWidth: 0,
  },
  hint: {
    marginTop: Spacing.sm,
  },
  category: {
    letterSpacing: 0.8,
    marginTop: Spacing.xl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm + 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centerNote: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
