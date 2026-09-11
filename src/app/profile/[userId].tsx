import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
} from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Routes } from '@shared/routes';
import AppIcon from '@shared/components/AppIcon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import CustomModal from '@shared/components/CustomModal';
import AppButton from '@shared/components/AppButton';
import YesMark from '@shared/components/YesMark';
import useModal from '@shared/hooks/useModal';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import ProfileHero from '@features/profile/components/ProfileHero';
import { useUserProfile, usePhotos } from '@features/profile/hooks/useProfile';
import { formatDistance } from '@features/discover/utils/format';
import { useUnmatch } from '@features/matches/hooks/useUnmatch';
import { useBlockUser } from '@features/matches/hooks/useBlockUser';
import { useReportUser } from '@features/matches/hooks/useReportUser';
import {
  REPORT_REASONS,
  DETAILS_MAX,
  needsDetails,
  type ReportReason,
} from '@features/profile/utils/reportReasons';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';

// Read-only view of a MATCH's profile. Deliberately a separate screen from
// the (tabs)/profile one: that screen is "you" and is editable, this one is
// "them" and can only be messaged, left or blocked. Sharing a component
// would mean one conditional per section and an easy way to render the
// wrong person's data as your own — the hero is shared, the screen is not.
//
// Photos come from the same usePhotos hook, and the DATABASE decides what
// it returns: `media` is owner-only plus an active-match policy, so when
// the match ends the photos stop resolving. No client-side check to
// forget.
export default function UserProfileScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { userId, matchId, name } = useLocalSearchParams<{
    userId: string;
    matchId?: string;
    name?: string;
  }>();

  const { data: profile, isPending, isError, error } = useUserProfile(userId);
  const { data: photos } = usePhotos(userId);
  const unmatch = useUnmatch();
  const block = useBlockUser();

  // Which destructive action the confirmation is asking about. One modal,
  // two questions — two modals with near-identical bodies is how you end
  // up shipping the wrong copy on one of them.
  const [pendingAction, setPendingAction] = useState<'unmatch' | 'block'>(
    'unmatch',
  );
  const { modalProps, openModal, closeModal } = useModal();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reporting is its own modal, not a third branch of the one above: it
  // asks a question (why?) rather than a confirmation (sure?), and its
  // body is a form. Folding it into pendingAction would have meant a
  // switch inside every line of that modal.
  const report = useReportUser();
  const reportModal = useModal();
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportDetailsMissing, setReportDetailsMissing] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const REASON_LABEL: Record<ReportReason, Translations> = {
    underage: Translations.PROFILE_VIEW_REPORT_REASON_UNDERAGE,
    harassment: Translations.PROFILE_VIEW_REPORT_REASON_HARASSMENT,
    inappropriate_photos:
      Translations.PROFILE_VIEW_REPORT_REASON_INAPPROPRIATE_PHOTOS,
    fake_profile: Translations.PROFILE_VIEW_REPORT_REASON_FAKE_PROFILE,
    spam: Translations.PROFILE_VIEW_REPORT_REASON_SPAM,
    other: Translations.PROFILE_VIEW_REPORT_REASON_OTHER,
  };

  const openReport = () => {
    setReportReason(null);
    setReportDetails('');
    setReportDetailsMissing(false);
    reportModal.openModal();
  };

  const submitReport = () => {
    if (!userId || !reportReason) return;
    if (needsDetails(reportReason) && !reportDetails.trim()) {
      setReportDetailsMissing(true);
      return;
    }
    report.mutate(
      {
        userId,
        matchId: matchId ?? null,
        reason: reportReason,
        details: reportDetails,
      },
      {
        onSuccess: () => {
          reportModal.closeModal();
          setReportSent(true);
        },
        onError: err =>
          setErrorMsg(
            errorMessage(err, Translations.PROFILE_VIEW_REPORT_ERROR),
          ),
      },
    );
  };

  const displayName = profile?.display_name ?? name ?? '';
  const mode = profile?.profile_mode ?? null;
  const modeLabel = t(
    mode === 'traveler'
      ? Translations.PROFILE_BADGE_TRAVELER
      : mode === 'local'
        ? Translations.PROFILE_BADGE_LOCAL
        : Translations.PROFILE_BADGE_LOCATING,
  );

  const shared = new Set(profile?.shared_interest_names ?? []);

  const confirmBlock = () => {
    if (!userId) return;
    closeModal();
    block.mutate(userId, {
      onSuccess: () => router.replace(Routes.tabs.matches),
      onError: err =>
        setErrorMsg(errorMessage(err, Translations.PROFILE_VIEW_BLOCK_ERROR)),
    });
  };

  const confirmUnmatch = () => {
    if (!matchId) return;
    closeModal();
    unmatch.mutate(matchId, {
      // Back to the list, not back one screen: this screen AND the chat it
      // was opened from both refer to a match that no longer exists.
      // Landing on a chat whose match is gone is the kind of dead end that
      // looks like a bug.
      onSuccess: () => router.replace(Routes.tabs.matches),
      onError: err =>
        setErrorMsg(errorMessage(err, Translations.PROFILE_VIEW_UNMATCH_ERROR)),
    });
  };

  const busy = unmatch.isPending || block.isPending;

  if (isPending) {
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

  // `!profile` covers two different things and both mean the same to the
  // reader: the read failed, or the RPC returned no row because the pair
  // is blocked. Neither should show a half-drawn profile.
  if (isError || !profile) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <AppIcon
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
          {errorMessage(error, Translations.PROFILE_ERROR)}
        </AppText>
        <Spacer spacing={Spacing.lg} />
        <AppButton variant="link" onPress={() => router.back()}>
          {t(Translations.PROFILE_EDIT_BACK)}
        </AppButton>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {/* The hero runs under the status bar, so its icons are light here
          regardless of theme. Not gated on focus: unlike a tab, this
          screen unmounts when you leave it, and RN restores the previous
          bar style by itself. */}
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <ProfileHero
          photoUrls={(photos ?? []).map(p => p.url)}
          fallbackUrl={profile.avatar_url}
          displayName={displayName}
          age={profile.age}
          city={profile.home_city}
          mode={mode}
          modeLabel={modeLabel}
          distanceLabel={
            profile.distance_km != null
              ? formatDistance(profile.distance_km, t)
              : null
          }
          leftAction={
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t(Common.A11Y_BACK)}
              hitSlop={Layout.HIT_SLOP}
              style={[
                styles.roundOnPhoto,
                {
                  backgroundColor: theme.colors.headerPill,
                  borderColor: theme.colors.headerPillBorder,
                },
                theme.dark ? null : styles.onPhotoShadow,
              ]}
            >
              <AppIcon
                name="chevron-left"
                size={24}
                color={theme.colors.onHeaderPill}
              />
            </Pressable>
          }
        />

        <View style={styles.body}>
          {/* The primary action on someone else's profile is to talk to
              them. Only offered when there is a match to talk inside —
              this screen is also reachable for someone you have only
              blocked or unmatched from another entry point. */}
          {matchId ? (
            <Pressable
              // dismissTo, NOT push and NOT navigate. The chat header
              // opens this screen and this button goes back to the chat,
              // so two pushes made a loop that grew the stack by two every
              // round. navigate was the first fix and did nothing here:
              // expo-router 6 reuses a route only when it is the CURRENT
              // top, and from this screen the top is 'profile', so the
              // chat was pushed again anyway. dismissTo pops back to the
              // chat underneath — and still pushes one when this screen
              // was reached from the deck and no chat is open.
              onPress={() =>
                router.dismissTo({
                  pathname: Routes.chat,
                  params: {
                    matchId,
                    name: displayName,
                    userId: profile.user_id,
                    ...(profile.avatar_url
                      ? { avatar: profile.avatar_url }
                      : {}),
                  },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_VIEW_MESSAGE, {
                name: displayName,
              })}
              style={styles.messageButton}
            >
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.messageButtonFill}
              >
                <AppIcon
                  name="chat-outline"
                  size={19}
                  color={theme.colors.onGradient}
                />
                <AppText
                  variant="buttonLg"
                  style={{
                    color: theme.colors.onGradient,
                  }}
                >
                  {t(Translations.PROFILE_VIEW_MESSAGE, {
                    name: displayName,
                  })}
                </AppText>
              </LinearGradient>
            </Pressable>
          ) : null}

          {profile.bio?.trim() ? (
            <>
              <AppText
                variant="overline"
                style={[
                  styles.sectionLabel,
                  {
                    color: theme.colors.onSurfaceFaint,
                  },
                ]}
              >
                {t(Translations.PROFILE_SECTION_ABOUT)}
              </AppText>
              <AppText
                variant="bodyLg"
                style={[
                  styles.bio,
                  {
                    color: theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {profile.bio.trim()}
              </AppText>
            </>
          ) : null}

          {profile.interest_names.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <AppText
                  variant="overline"
                  style={{
                    color: theme.colors.onSurfaceFaint,
                  }}
                >
                  {t(Translations.PROFILE_SECTION_INTERESTS)}
                </AppText>
                {shared.size > 0 ? (
                  <AppText
                    variant="microStrong"
                    style={{
                      color: theme.colors.primary,
                    }}
                  >
                    {t(Translations.PROFILE_VIEW_IN_COMMON, {
                      count: shared.size,
                    })}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.chips}>
                {profile.interest_names.map(interest => {
                  const isShared = shared.has(interest);
                  return (
                    <View
                      key={interest}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isShared
                            ? theme.colors.surfaceSelected
                            : theme.colors.surfaceElevated,
                          borderColor: isShared
                            ? theme.colors.outlineSelected
                            : theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      {/* A tick, not just a tint: shared is the reason
                          these two were shown to each other, and colour
                          alone does not survive a colour-blind reader. */}
                      {isShared ? (
                        <AppIcon
                          name="check"
                          size={12}
                          color={theme.colors.primary}
                        />
                      ) : null}
                      <AppText
                        variant={isShared ? 'microStrong' : 'micro'}
                        style={{
                          color: isShared
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        }}
                      >
                        {interest}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          <View style={styles.spacer} />

          {/* Report sits ABOVE the two destructive buttons and looks like
              a link, not a button: it does nothing to the match. It is a
              message to us about this person, and the reporter stays free
              to block afterwards — the button for that is right below. */}
          <Pressable
            onPress={openReport}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t(Translations.PROFILE_VIEW_REPORT, {
              name: displayName,
            })}
            style={styles.reportLink}
          >
            <AppIcon
              name="flag-outline"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <AppText
              variant="bodySmallStrong"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
            >
              {t(Translations.PROFILE_VIEW_REPORT, { name: displayName })}
            </AppText>
          </Pressable>

          {/* Both destructive, side by side, and neither is a primary
              button. Unmatch is neutral, Block wears the error tone —
              they are not equivalent: unmatch ends a conversation, block
              says never show me this person again. */}
          <View
            style={[
              styles.destructiveRow,
              {
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            {matchId ? (
              <Pressable
                onPress={() => {
                  setPendingAction('unmatch');
                  openModal();
                }}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t(Translations.PROFILE_VIEW_UNMATCH)}
                accessibilityState={{ disabled: busy }}
                style={[
                  styles.destructiveButton,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                {unmatch.isPending ? (
                  <ActivityIndicator size={16} />
                ) : (
                  <YesMark
                    size={19}
                    struck
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
                <AppText
                  variant="bodySmallStrong"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                  }}
                >
                  {t(Translations.PROFILE_VIEW_UNMATCH)}
                </AppText>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                setPendingAction('block');
                openModal();
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t(Translations.PROFILE_VIEW_BLOCK)}
              accessibilityHint={t(Translations.PROFILE_VIEW_BLOCK_BODY)}
              accessibilityState={{ disabled: busy }}
              style={[
                styles.destructiveButton,
                {
                  backgroundColor: theme.colors.errorContainer,
                  borderColor: theme.colors.errorOutline,
                },
              ]}
            >
              {block.isPending ? (
                <ActivityIndicator size={16} />
              ) : (
                <AppIcon
                  name="block-helper"
                  size={17}
                  color={theme.colors.error}
                />
              )}
              <AppText
                variant="bodySmallStrong"
                style={{
                  color: theme.colors.error,
                }}
              >
                {t(Translations.PROFILE_VIEW_BLOCK)}
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CustomModal {...modalProps} onDismiss={closeModal}>
        <AppText
          variant="h3"
          style={[
            styles.modalText,
            {
              color: theme.colors.onSurface,
            },
          ]}
        >
          {t(
            pendingAction === 'block'
              ? Translations.PROFILE_VIEW_BLOCK_TITLE
              : Translations.PROFILE_VIEW_UNMATCH_TITLE,
            { name: displayName },
          )}
        </AppText>
        <Spacer spacing={Spacing.sm} />
        <AppText
          variant="body"
          style={[
            styles.modalText,
            {
              color: theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {t(
            pendingAction === 'block'
              ? Translations.PROFILE_VIEW_BLOCK_BODY
              : Translations.PROFILE_VIEW_UNMATCH_BODY,
          )}
        </AppText>
        <Spacer spacing={Spacing.lg} />
        <AppButton
          variant="primary"
          buttonColor={theme.colors.error}
          onPress={pendingAction === 'block' ? confirmBlock : confirmUnmatch}
        >
          {t(
            pendingAction === 'block'
              ? Translations.PROFILE_VIEW_BLOCK_CONFIRM
              : Translations.PROFILE_VIEW_UNMATCH_CONFIRM,
          )}
        </AppButton>
        <Spacer spacing={Spacing.sm} />
        <AppButton variant="link" onPress={closeModal}>
          {t(Translations.PROFILE_VIEW_UNMATCH_CANCEL)}
        </AppButton>
      </CustomModal>

      <CustomModal {...reportModal.modalProps}>
        <AppText
          variant="h3"
          style={[
            styles.modalText,
            {
              color: theme.colors.onSurface,
            },
          ]}
        >
          {t(Translations.PROFILE_VIEW_REPORT_TITLE, { name: displayName })}
        </AppText>
        <Spacer spacing={Spacing.sm} />
        <AppText
          variant="body"
          style={[
            styles.modalText,
            {
              color: theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {t(Translations.PROFILE_VIEW_REPORT_BODY)}
        </AppText>
        <Spacer spacing={Spacing.md} />

        <View style={styles.reasonList}>
          {REPORT_REASONS.map(reason => {
            const selected = reportReason === reason;
            return (
              <Pressable
                key={reason}
                onPress={() => {
                  setReportReason(reason);
                  setReportDetailsMissing(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[
                  styles.reasonRow,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceElevated,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
                  },
                ]}
              >
                <AppIcon
                  name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={selected ? theme.colors.primary : theme.colors.outline}
                />
                <AppText
                  variant="bodySmallStrong"
                  style={{
                    color: selected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurface,
                    flexShrink: 1,
                  }}
                >
                  {t(REASON_LABEL[reason])}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <Spacer spacing={Spacing.md} />
        <TextInput
          value={reportDetails}
          onChangeText={text => {
            setReportDetails(text);
            if (text.trim()) setReportDetailsMissing(false);
          }}
          placeholder={t(
            reportReason && needsDetails(reportReason)
              ? Translations.PROFILE_VIEW_REPORT_DETAILS_REQUIRED_HINT
              : Translations.PROFILE_VIEW_REPORT_DETAILS,
          )}
          placeholderTextColor={theme.colors.onSurfaceFaint}
          multiline
          maxLength={DETAILS_MAX}
          accessibilityLabel={t(Translations.PROFILE_VIEW_REPORT_DETAILS)}
          style={[
            styles.detailsInput,
            {
              color: theme.colors.onSurface,
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: reportDetailsMissing
                ? theme.colors.error
                : theme.colors.outlineVariant,
            },
          ]}
        />
        {reportDetailsMissing ? (
          <AppText
            variant="bodySmall"
            style={{
              color: theme.colors.error,
              marginTop: Spacing.xs,
            }}
          >
            {t(Translations.PROFILE_VIEW_REPORT_DETAILS_REQUIRED)}
          </AppText>
        ) : null}

        <Spacer spacing={Spacing.lg} />
        <AppButton
          variant="primary"
          onPress={submitReport}
          disabled={!reportReason || report.isPending}
          loading={report.isPending}
        >
          {t(Translations.PROFILE_VIEW_REPORT_SUBMIT)}
        </AppButton>
        <Spacer spacing={Spacing.sm} />
        <AppButton variant="link" onPress={reportModal.closeModal}>
          {t(Translations.PROFILE_VIEW_UNMATCH_CANCEL)}
        </AppButton>
      </CustomModal>

      <Snackbar
        visible={!!errorMsg}
        onDismiss={() => setErrorMsg(null)}
        duration={4000}
      >
        {errorMsg ?? ''}
      </Snackbar>

      <Snackbar
        visible={reportSent}
        onDismiss={() => setReportSent(false)}
        duration={4000}
      >
        {t(Translations.PROFILE_VIEW_REPORT_SENT)}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
  roundOnPhoto: {
    width: Layout.CHAT_AVATAR,
    height: Layout.CHAT_AVATAR,
    borderRadius: Layout.CHAT_AVATAR / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onPhotoShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  body: {
    flex: 1,
    paddingHorizontal: Layout.SCREEN_PADDING,
    marginTop: Layout.HERO_CONTENT_OVERLAP,
  },
  messageButton: {
    borderRadius: Layout.BUTTON_LG_RADIUS,
    overflow: 'hidden',
  },
  messageButtonFill: {
    height: Layout.BUTTON_LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  sectionLabel: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Layout.SECTION_GAP,
  },
  bio: {
    marginTop: Layout.CHIP_GAP,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.CHIP_GAP,
    marginTop: Spacing.sm + 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.PROGRESS_BAR_GAP,
    paddingHorizontal: Layout.CHIP_PADDING_H,
    paddingVertical: Layout.CHIP_PADDING_V,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  destructiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  destructiveButton: {
    flex: 1,
    height: Layout.BUTTON_LG - 6,
    borderRadius: (Layout.BUTTON_LG - 6) / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.CHIP_GAP,
  },
  modalText: {
    textAlign: 'center',
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    // A generous hit area for a small link, without it looking like a
    // button: the padding is vertical only.
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  // CustomModal centres its children, which suits a title and a button
  // and shrinks a form to its content: on the device the details box
  // collapsed to the width of whatever had been typed in it. Both form
  // parts stretch.
  reasonList: {
    alignSelf: 'stretch',
    gap: Spacing.xs,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  detailsInput: {
    alignSelf: 'stretch',
    minHeight: 72,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
  },
});
