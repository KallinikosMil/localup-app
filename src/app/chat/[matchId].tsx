import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '@shared/components/AppIcon';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import RetryButton from '@shared/components/RetryButton';
import { RootState } from '@store';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import {
  useChat,
  useSendMessage,
  type ChatMessage,
} from '@features/chat/hooks/useChat';
import { useMarkMatchRead } from '@features/matches/hooks/useReadTracking';
import { useMatches } from '@features/matches/hooks/useMatches';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { useAppTheme } from '@theme/paper';
import { Layout } from '@theme/constants/Layout';
import { Typography } from '@theme/typography';
import AmbientGlow from '@shared/components/AmbientGlow';
import { formatDate } from '@shared/utils/date';
import {
  relativeTime,
  sameCalendarDay,
} from '@features/matches/utils/relativeTime';
import { Translations } from '@features/chat/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

export default function ChatScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const {
    matchId,
    name: nameParam,
    threadId,
    userId: userIdParam,
    avatar: avatarParam,
  } = useLocalSearchParams<{
    matchId: string;
    // All of these are optional in practice: a notification tap arrives
    // with only a matchId. They are a fast path, not the source of truth —
    // see the lookup below.
    name?: string;
    // Passed from Matches (which already
    // knows it) so the chat skips the
    // thread lookup. Absent on deep links
    // / brand-new matches → resolved in
    // the fallback path.
    threadId?: string;
    // Also handed over from Matches, so the header can open their
    // profile without a second lookup. Absent on deep links — the
    // header just isn't tappable then.
    userId?: string;
    // Their avatar, for the header. Passed along rather than fetched:
    // the Matches row already has it and a chat header should not wait
    // on a round trip to draw itself.
    avatar?: string;
  }>();
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const insets = useSafeAreaInsets();
  const errorMessage = useErrorMessage();

  // Matches hands the header everything it needs; a notification tap hands
  // it only a matchId, so without this the header read "Chat" next to a
  // blank avatar for the one entry point where you most want to see who
  // you are talking to. The matches list is already loaded and cached, so
  // recovering the rest is a lookup rather than a request.
  const { data: matches } = useMatches();
  const fromList = (matches ?? []).find(m => m.id === matchId);
  const name = nameParam ?? fromList?.display_name;
  const userId = userIdParam ?? fromList?.user_id;
  const avatar = avatarParam ?? fromList?.avatar_url ?? undefined;
  // Only ever from the cached matches list — a deep link has no mode and
  // the subtitle simply does not render.
  const mode = fromList?.match_mode ?? null;

  const { messages, isLoading, isError, error, refetch } = useChat(
    matchId,
    threadId ?? null,
  );
  const sendMessage = useSendMessage(matchId);

  // Clear this match's unread state while it's open. Runs on mount and
  // whenever a new message arrives during the visit. Mark read up to the
  // newest message's own timestamp (not just Date.now()) so device/server
  // clock skew can't leave a just-read chat still flagged unread.
  const markRead = useMarkMatchRead();
  const newestActivity = (messages ?? []).reduce(
    (max, m) => Math.max(max, new Date(m.created_at).getTime()),
    0,
  );
  // Only once the thread has actually LOADED. This used to fire on mount
  // gated on matchId alone, so a failed or still-running fetch cleared the
  // unread state anyway — and the watermark is one-way: match_reads has a
  // no-rewind trigger and no DELETE policy, so a badge cleared for messages
  // nobody saw can never come back. isLoading/isError are the difference
  // between "you read it" and "we tried to show it to you".
  useEffect(() => {
    if (!matchId || isLoading || isError) return;
    void markRead(matchId, Math.max(Date.now(), newestActivity + 1));
  }, [matchId, isLoading, isError, newestActivity, markRead]);

  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  // After a few seconds of loading, reassure the user the screen
  // isn't frozen — a Supabase project waking from auto-pause can
  // take 10-20s (V4). Resets whenever loading ends.
  const [slowLoading, setSlowLoading] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setSlowLoading(false);
      return;
    }
    const t = setTimeout(() => setSlowLoading(true), 4500);
    return () => clearTimeout(t);
  }, [isLoading]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Clear optimistically so the box feels instant — but if the send
    // fails, put the text BACK. It used to be destroyed: setText('')
    // ran before mutate, there was no onError, and isError was never
    // read, so a failed send silently ate the message and the user
    // assumed it had gone (H2). Only restore if the box is still
    // empty — never clobber something typed in the meantime.
    setText('');
    sendMessage.mutate(trimmed, {
      onError: () => {
        setText(prev => (prev.trim() ? prev : trimmed));
      },
    });
  };

  // Reuses the list's relative-time rules so a conversation and the
  // Matches row above it never disagree about what day something was.
  // Anything from today reads "Today" — the hour is on the row, not here.
  const dayLabel = (iso: string) => {
    const r = relativeTime(iso);
    switch (r.kind) {
      case 'now':
      case 'minutes':
      case 'hours':
        return t(Translations.CHAT_DAY_TODAY);
      case 'yesterday':
        return t(Translations.CHAT_DAY_YESTERDAY);
      case 'weekday':
        return formatDate(r.date, language, { weekday: 'long' });
      case 'date':
        return formatDate(r.date, language, {
          day: 'numeric',
          month: 'long',
        });
      case 'none':
        return '';
    }
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const isMine = item.sender_id === uid;
    // Oldest first (the list scrolls to the end, it is not inverted), so
    // the previous index is the older message and a separator belongs
    // ABOVE the first message of each day.
    const older = messages?.[index - 1];
    const showDay =
      !older || !sameCalendarDay(item.created_at, older.created_at);

    const bubble = (
      <View
        style={[
          styles.bubble,
          isMine
            ? styles.bubbleMine
            : [
                styles.bubbleTheirs,
                {
                  // A surface with a hairline, not a fill. surfaceVariant is
                  // violet enough that their messages competed with the
                  // accent on ours and the whole thread read as one voice.
                  // The accent means "me" and nothing else.
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.outlineVariant,
                },
              ],
        ]}
      >
        {/* A sent bubble gets its own gradient, darker than the brand one
            at both ends: a bubble is a small block of white text, and the
            brand gradient is light enough at its top end that a short
            message sitting there loses contrast. */}
        {isMine ? (
          <LinearGradient
            colors={[theme.colors.bubbleStart, theme.colors.bubbleEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <AppText
          variant="message"
          style={{
            color: isMine ? theme.colors.onGradient : theme.colors.onSurface,
          }}
        >
          {item.body}
        </AppText>
      </View>
    );

    if (!showDay) return bubble;

    return (
      <>
        <View
          style={[
            styles.dayPill,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <AppText
            variant="microStrong"
            style={{
              color: theme.colors.onSurfaceFaint,
            }}
          >
            {dayLabel(item.created_at)}
          </AppText>
        </View>
        {bubble}
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      // W8: on Android `behavior` was undefined, relying on native
      // window resize — but edgeToEdgeEnabled (Android 15) draws behind
      // the IME and no longer auto-resizes, so the input sat under the
      // keyboard. Give Android an explicit behavior. The KAV wraps the
      // whole screen inside the app-level SafeAreaView, so its top sits
      // at insets.top — pass that as keyboardVerticalOffset so the
      // avoided region is measured from the right origin. (Dae tunes the
      // exact value on the Redmi; flip to "padding" if "height" is
      // jumpy.)
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : insets.top}
    >
      {/* Mirrored to the top-RIGHT, so moving from Matches into a chat
          does not look like the same page redrawn. */}
      <AmbientGlow
        size={Layout.GLOW_SIZE_SM}
        x={Layout.GLOW_SIZE_SM / 2}
        y={Layout.GLOW_OFFSET_Y}
      />

      {/* Header. Not a tinted toolbar — a chat is a room you are in, not
          a screen you are operating, so a hairline does the separating and
          nothing fills behind it. It has NO background: the header is a
          sibling above the list, not an overlay, so messages can never
          scroll under it, and an opaque fill only served to cut the
          ambient glow in half. */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t(Common.A11Y_BACK)}
          style={styles.backButton}
        >
          <AppIcon
            name="chevron-left"
            size={28}
            color={theme.colors.onBackground}
          />
        </Pressable>
        {/* Avatar + name, tappable as ONE target — the way every chat app
            does it. No pill, no chevron: the person's own photo next to
            their name is the affordance, and dressing it up as a button
            makes the header look like a toolbar instead of a conversation.
            Inert when we don't know who they are (deep link, no id). */}
        <Pressable
          onPress={() =>
            userId
              ? router.push({
                  pathname: '/profile/[userId]',
                  params: { userId, matchId, name: name ?? '' },
                })
              : undefined
          }
          disabled={!userId}
          // One target, so announce it as one thing. Without a label the
          // reader would read the avatar and the name as two stray items and
          // never say that tapping opens the profile.
          accessibilityRole="button"
          accessibilityLabel={name ?? ''}
          accessibilityHint={t(Common.A11Y_OPEN_PROFILE)}
          accessibilityState={{ disabled: !userId }}
          hitSlop={8}
          style={styles.headerTitle}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={[
                styles.headerAvatar,
                { borderColor: theme.colors.outlineSelected },
              ]}
            />
          ) : (
            <View
              style={[
                styles.headerAvatar,
                styles.headerAvatarFallback,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.outlineSelected,
                },
              ]}
            >
              <AppIcon
                name="account"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
          <View style={styles.headerText}>
            <AppText
              variant="chatTitle"
              accessibilityRole="header"
              numberOfLines={1}
              style={{
                color: theme.colors.onBackground,
              }}
            >
              {name ?? t(Translations.CHAT_TITLE_FALLBACK)}
            </AppText>
            {/* The artboard also shows a green presence dot and a
                distance. We track neither — there is no presence system,
                and the chat has no coordinates — so the subtitle carries
                only what is actually known. Inventing an "online" light
                would be a lie the user would rely on. */}
            {mode ? (
              <AppText
                variant="micro"
                numberOfLines={1}
                style={{
                  color: theme.colors.onSurfaceFaint,
                }}
              >
                {mode === 'traveler'
                  ? t(Common.COMMON_MODE_TRAVELER)
                  : t(Common.COMMON_MODE_LOCAL)}
              </AppText>
            ) : null}
          </View>
        </Pressable>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator animating size="large" />
          {slowLoading ? (
            <AppText
              variant="body"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                marginTop: Spacing.lg,
              }}
            >
              {t(Translations.CHAT_WAKING)}
            </AppText>
          ) : null}
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <AppIcon
            name="message-alert-outline"
            size={40}
            color={theme.colors.onSurfaceVariant}
          />
          <AppText
            variant="body"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginTop: Spacing.md,
            }}
          >
            {errorMessage(error, Translations.CHAT_ERROR)}
          </AppText>
          <RetryButton
            label={t(Translations.CHAT_RETRY)}
            onPress={() => refetch()}
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({
              animated: false,
            })
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <AppText
                variant="body"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                }}
              >
                {t(Translations.CHAT_EMPTY)}
              </AppText>
            </View>
          }
        />
      )}

      {/* Input */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.background,
            paddingBottom: Spacing.md,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            Typography.message.style,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.outlineVariant,
              color: theme.colors.onSurface,
            },
          ]}
          placeholder={t(Translations.CHAT_INPUT_PLACEHOLDER)}
          placeholderTextColor={theme.colors.onSurfaceFaint}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        {/* Gradient only when there is something to send. A disabled
            brand gradient reads as an enabled button you cannot press;
            a flat surface reads as what it is. */}
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          accessibilityRole="button"
          accessibilityLabel={t(Common.A11Y_SEND)}
          accessibilityState={{
            disabled: !text.trim() || sendMessage.isPending,
          }}
          style={[
            styles.sendBtn,
            text.trim()
              ? null
              : {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                },
          ]}
        >
          {text.trim() ? (
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <AppIcon
            name="send"
            size={21}
            color={
              text.trim()
                ? theme.colors.onGradient
                : theme.colors.onSurfaceFaint
            }
          />
        </Pressable>
      </View>

      <Snackbar
        visible={sendMessage.isError}
        onDismiss={() => sendMessage.reset()}
        duration={4000}
      >
        {errorMessage(sendMessage.error, Translations.CHAT_SEND_ERROR)}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerAvatar: {
    width: Layout.CHAT_AVATAR,
    height: Layout.CHAT_AVATAR,
    borderRadius: Layout.CHAT_AVATAR / 2,
    borderWidth: Layout.CHAT_AVATAR_RING,
  },
  headerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    height: Layout.CHAT_HEADER_HEIGHT,
    paddingRight: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: Layout.TAB_SEGMENT_HEIGHT,
    height: Layout.TAB_SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: Layout.ICON_BUTTON + 4,
    height: Layout.ICON_BUTTON + 4,
    borderRadius: (Layout.ICON_BUTTON + 4) / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPill: {
    alignSelf: 'center',
    paddingHorizontal: Layout.CARD_INNER_GAP,
    paddingVertical: Layout.PROGRESS_BAR_GAP,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    marginVertical: Spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: Layout.CHAT_AVATAR / 2,
    paddingTop: Layout.CHAT_AVATAR / 2,
    paddingBottom: Spacing.sm,
  },
  bubble: {
    maxWidth: Layout.BUBBLE_MAX_WIDTH,
    paddingHorizontal: Layout.BUBBLE_PADDING_H,
    paddingVertical: Layout.BUBBLE_PADDING_V,
    borderRadius: Layout.BUBBLE_RADIUS,
    // Half the design gap on each bubble adds up to the full gap between
    // any two of them.
    marginVertical: Layout.BUBBLE_GAP / 2,
    overflow: 'hidden',
  },
  // The small corner is the one nearest its sender. It is the only
  // asymmetry in the shape, and it is what says who is speaking without a
  // label or an avatar on every line.
  bubbleMine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Layout.BUBBLE_TAIL_RADIUS,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Layout.BUBBLE_TAIL_RADIUS,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm + 2,
  },
  input: {
    flex: 1,
    minHeight: Layout.COMPOSER_HEIGHT,
    maxHeight: Layout.COMPOSER_HEIGHT * 2,
    borderRadius: Layout.COMPOSER_RADIUS,
    borderWidth: 1,
    paddingHorizontal: Layout.COMPOSER_PADDING_H,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  sendBtn: {
    width: Layout.COMPOSER_HEIGHT,
    height: Layout.COMPOSER_HEIGHT,
    borderRadius: Layout.COMPOSER_HEIGHT / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
