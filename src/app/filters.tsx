import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import AmbientGlow from '@shared/components/AmbientGlow';
import ScreenSafeArea from '@shared/components/ScreenSafeArea';
import { DualSlider, SingleSlider } from '@shared/components/RangeSlider';
import useLocation from '@shared/hooks/useLocation';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import {
  PREF_DEFAULTS,
  SUGGEST_CAP_KM,
  useCandidateCount,
  useDistanceSummary,
  useMatchPreferences,
  useUpdateMatchPreferences,
  type MatchPreferences,
} from '@features/discover/hooks/useMatchPreferences';
import { isAgeNarrowed } from '@features/discover/utils/deckEmpty';
import { useProfile } from '@features/profile/hooks/useProfile';
import { computeMode } from '@features/profile/utils/mode';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/discover/i18n/translationKeys';
import { Translations as Profile } from '@features/profile/i18n/translationKeys';

// The deck filters. match_preferences has been read on every deck build
// since the RPC was written and set by nothing, so everyone has been on
// 75 km and 18-99 with no way out.
//
// The slider range stops at 150 rather than the 500 the column allows: past
// that the "nearby" idea stops meaning anything, and the column is wider on
// purpose so the ceiling can be raised without a migration.
const DISTANCE_BOUNDS = { min: 5, max: 150 };
const AGE_BOUNDS = { min: 18, max: 99 };
// Below this a deck is swiped out in one sitting and the app reads as empty.
const THIN_DECK = 5;

export default function FiltersScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();

  const saved = useMatchPreferences();
  const update = useUpdateMatchPreferences();
  const { latitude, longitude } = useLocation();
  const { data: profile } = useProfile();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Draft, seeded once. The whole point of this screen is trying a setting
  // before committing it, so the count and the warning below follow the
  // DRAFT rather than what is stored.
  const [draft, setDraft] = useState<MatchPreferences | null>(null);
  useEffect(() => {
    if (draft === null && saved.data) setDraft(saved.data);
  }, [saved.data, draft]);

  const prefs = draft ?? PREF_DEFAULTS;
  const count = useCandidateCount(draft ?? undefined);
  const spread = useDistanceSummary(prefs.minAge, prefs.maxAge);

  // You always see the opposite mode, so the word for the people in the
  // count is the opposite of your own.
  const myMode = computeMode(profile, latitude, longitude);
  const theyAre =
    myMode === 'local'
      ? Translations.FILTERS_MATCH_TRAVELERS
      : Translations.FILTERS_MATCH_LOCALS;
  const theyAreNarrow =
    myMode === 'local'
      ? Translations.FILTERS_NARROW_TRAVELERS
      : Translations.FILTERS_NARROW_LOCALS;

  const dirty =
    !!saved.data &&
    (saved.data.maxDistanceKm !== prefs.maxDistanceKm ||
      saved.data.minAge !== prefs.minAge ||
      saved.data.maxAge !== prefs.maxAge);
  const canSave = dirty && !update.isPending;

  // Two different empty answers. A thin deck can be widened; nobody at ANY
  // distance means the age range is the thing excluding everyone, and
  // offering a bigger radius there is simply wrong advice.
  //
  // This used to read `spread.data === null`, which was also what a missing
  // GPS fix looked like — so someone whose location had not reported yet
  // was told "no one in that age range". The server distinguishes them now:
  // null is no fix, `total: 0` is "we looked and found nobody". And it is
  // only an AGE story if the range was actually narrowed; on the default
  // 18-99 an empty result just means nobody is out there.
  const ageBlocks =
    !!spread.data &&
    spread.data.total === 0 &&
    isAgeNarrowed(prefs.minAge, prefs.maxAge);
  const thin =
    !ageBlocks &&
    typeof count.data === 'number' &&
    count.data < THIN_DECK &&
    !!spread.data &&
    spread.data.total > 0 &&
    spread.data.suggestedKm > prefs.maxDistanceKm;

  // The warning always explains. The BUTTON only appears while the radius
  // it would set is one we would defend — past the cap we leave the reader
  // with the facts and the slider they are already looking at, rather than
  // a one-tap shortcut to a deck they cannot travel to.
  const widenToKm =
    thin && spread.data && spread.data.suggestedKm <= SUGGEST_CAP_KM
      ? spread.data.suggestedKm
      : null;

  const onSave = () => {
    if (!draft) return;
    update.mutate(draft, {
      onSuccess: () => router.back(),
      onError: err =>
        setErrorMsg(errorMessage(err, Translations.FILTERS_SAVE_ERROR)),
    });
  };

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
              {t(Profile.PROFILE_CANCEL)}
            </AppText>
          </Pressable>

          <AppText
            variant="chatTitle"
            accessibilityRole="header"
            style={{ color: theme.colors.onBackground }}
          >
            {t(Translations.FILTERS_TITLE)}
          </AppText>

          <View style={[styles.headerSide, styles.headerRight]}>
            <Pressable
              onPress={onSave}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              accessibilityLabel={t(Profile.PROFILE_SAVE)}
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
                    {t(Profile.PROFILE_SAVE)}
                  </AppText>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {saved.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator animating size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {/* Distance */}
            <View style={styles.sectionHead}>
              <AppText
                variant="microStrong"
                style={[styles.label, { color: theme.colors.onSurfaceFaint }]}
              >
                {t(Translations.FILTERS_DISTANCE).toUpperCase()}
              </AppText>
              <AppText
                variant="micro"
                style={{ color: theme.colors.onSurfaceFaint }}
              >
                {t(Translations.FILTERS_DISTANCE_RANGE, {
                  min: DISTANCE_BOUNDS.min,
                  max: DISTANCE_BOUNDS.max,
                })}
              </AppText>
            </View>
            <AppText
              variant="displayLg"
              style={[styles.value, { color: theme.colors.onBackground }]}
            >
              {t(Translations.FILTERS_KM, { km: prefs.maxDistanceKm })}
            </AppText>

            <SingleSlider
              value={prefs.maxDistanceKm}
              bounds={DISTANCE_BOUNDS}
              step={5}
              accessibilityLabel={t(Translations.FILTERS_DISTANCE)}
              formatEnd={v => t(Translations.FILTERS_KM, { km: v })}
              onChange={km =>
                setDraft(p => ({ ...(p ?? PREF_DEFAULTS), maxDistanceKm: km }))
              }
            />

            {/* The count follows the draft, so it answers the setting under
                the user's thumb rather than the one on the server. */}
            <View style={styles.countRow}>
              <MaterialCommunityIcons
                importantForAccessibility="no"
                accessibilityElementsHidden
                name="account-group-outline"
                size={17}
                color={theme.colors.onSurfaceVariant}
              />
              <AppText
                variant="bodySmall"
                style={[styles.countText, { color: theme.colors.onSurface }]}
              >
                {count.isPending || typeof count.data !== 'number'
                  ? ' '
                  : t(theyAre, { count: count.data })}
              </AppText>
            </View>
            <AppText
              variant="caption"
              style={[styles.summary, { color: theme.colors.onSurfaceFaint }]}
            >
              {/* Deliberately no city. This said "within 10 km of
                  {home_city}", and the radius is measured from where you
                  ARE — so it told a traveller in Athens that their deck
                  was drawn around Lisbon. We do not store a name for the
                  current position, only coordinates, so the honest
                  sentence names no place at all. */}
              {t(Translations.FILTERS_SUMMARY, {
                km: prefs.maxDistanceKm,
                min: prefs.minAge,
                max: prefs.maxAge,
              })}
            </AppText>

            {ageBlocks ? (
              <View
                style={[
                  styles.warn,
                  {
                    backgroundColor: theme.colors.warningContainer,
                    borderColor: theme.colors.warningOutline,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  importantForAccessibility="no"
                  accessibilityElementsHidden
                  name="alert-outline"
                  size={19}
                  color={theme.colors.onWarningContainer}
                />
                <AppText
                  variant="caption"
                  style={[
                    styles.warnBody,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t(Translations.FILTERS_AGE_BLOCKS)}
                </AppText>
              </View>
            ) : thin && spread.data ? (
              <View
                style={[
                  styles.warn,
                  {
                    backgroundColor: theme.colors.warningContainer,
                    borderColor: theme.colors.warningOutline,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  importantForAccessibility="no"
                  accessibilityElementsHidden
                  name="alert-outline"
                  size={19}
                  color={theme.colors.onWarningContainer}
                />
                <View style={styles.warnBody}>
                  <AppText
                    variant="bodySmallStrong"
                    style={{ color: theme.colors.onWarningContainer }}
                  >
                    {t(theyAreNarrow, { count: count.data ?? 0 })}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={[
                      styles.warnText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(Translations.FILTERS_NARROW_BODY, {
                      from: spread.data.p25Km,
                      to: spread.data.p75Km,
                      km: prefs.maxDistanceKm,
                    })}
                  </AppText>
                  {/* Widening is offered, never done for them: a narrow
                      radius is a legitimate choice, just a costly one. */}
                  {widenToKm !== null ? (
                    <Pressable
                      onPress={() =>
                        setDraft(p => ({
                          ...(p ?? PREF_DEFAULTS),
                          maxDistanceKm: widenToKm,
                        }))
                      }
                      accessibilityRole="button"
                      hitSlop={Layout.HIT_SLOP}
                      style={styles.widen}
                    >
                      <AppText
                        variant="bodySmallStrong"
                        style={{ color: theme.colors.primary }}
                      >
                        {t(Translations.FILTERS_WIDEN, { km: widenToKm })}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Age */}
            <View style={[styles.sectionHead, styles.sectionGap]}>
              <AppText
                variant="microStrong"
                style={[styles.label, { color: theme.colors.onSurfaceFaint }]}
              >
                {t(Translations.FILTERS_AGE).toUpperCase()}
              </AppText>
              <AppText
                variant="micro"
                style={{ color: theme.colors.onSurfaceFaint }}
              >
                {t(Translations.FILTERS_AGE_RANGE, {
                  min: AGE_BOUNDS.min,
                  max: AGE_BOUNDS.max,
                })}
              </AppText>
            </View>
            <AppText
              variant="displayLg"
              style={[styles.value, { color: theme.colors.onBackground }]}
            >
              {t(Translations.FILTERS_AGE_VALUE, {
                min: prefs.minAge,
                max: prefs.maxAge,
              })}
            </AppText>

            <DualSlider
              low={prefs.minAge}
              high={prefs.maxAge}
              bounds={AGE_BOUNDS}
              accessibilityLabel={t(Translations.FILTERS_AGE)}
              formatEnd={v => String(v)}
              onChange={(min, max) =>
                setDraft(p => ({
                  ...(p ?? PREF_DEFAULTS),
                  minAge: min,
                  maxAge: max,
                }))
              }
            />

            {/* Why there is no mode switch. Without this the absence reads
                as an omission rather than the product. */}
            <View
              style={[
                styles.modeCard,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <AppText
                variant="bodySmallStrong"
                style={{ color: theme.colors.onSurface }}
              >
                {t(Translations.FILTERS_MODE_TITLE)}
              </AppText>
              <AppText
                variant="caption"
                style={[
                  styles.modeBody,
                  { color: theme.colors.onSurfaceFaint },
                ]}
              >
                {t(Translations.FILTERS_MODE_BODY)}
              </AppText>
            </View>

            <Pressable
              onPress={() => setDraft({ ...PREF_DEFAULTS })}
              accessibilityRole="button"
              hitSlop={Layout.HIT_SLOP}
              style={styles.reset}
            >
              <AppText
                variant="labelStrong"
                style={{ color: theme.colors.primary }}
              >
                {t(Translations.FILTERS_RESET)}
              </AppText>
            </Pressable>
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
  root: { flex: 1 },
  header: {
    height: Layout.CHAT_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerSide: { width: 76 },
  headerRight: { alignItems: 'flex-end' },
  save: {
    height: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOff: { opacity: 0.4 },
  body: {
    padding: Layout.SCREEN_PADDING,
    paddingBottom: Spacing.xxl,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionGap: { marginTop: Spacing.xxl },
  label: { letterSpacing: 0.8 },
  value: { marginTop: Spacing.xs },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    marginTop: Spacing.lg,
  },
  countText: { flex: 1, minWidth: 0 },
  summary: { marginTop: Spacing.xs },
  warn: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.md + 4,
    borderWidth: 1,
  },
  warnBody: { flex: 1, minWidth: 0 },
  warnText: { marginTop: 3 },
  widen: { marginTop: Spacing.sm + 2, alignSelf: 'flex-start' },
  modeCard: {
    marginTop: Spacing.xxl,
    padding: Layout.CARD_PADDING,
    borderRadius: Layout.CARD_RADIUS,
    borderWidth: 1,
  },
  modeBody: { marginTop: Spacing.xs },
  reset: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
