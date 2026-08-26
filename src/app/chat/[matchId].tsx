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
import { useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import CircleIconButton from '@shared/components/CircleIconButton';
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
import { Translations } from '@features/chat/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

export default function ChatScreen() {
  const theme = useTheme();
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
  const { t } = useTranslation();

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
  useEffect(() => {
    if (matchId) {
      void markRead(matchId, Math.max(Date.now(), newestActivity + 1));
    }
  }, [matchId, newestActivity, markRead]);

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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === uid;
    return (
      <View
        style={[
          styles.bubble,
          isMine
            ? [
                styles.bubbleMine,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]
            : [
                styles.bubbleTheirs,
                {
                  // White with a hairline, not a fill. surfaceVariant is
                  // #E6E0F6 — violet enough that their messages competed
                  // with the accent on ours, and the whole thread read as
                  // one voice. The accent should mean "me" and nothing else.
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ],
        ]}
      >
        <AppText
          variant="body"
          style={{
            color: isMine ? theme.colors.onPrimary : theme.colors.onSurface,
          }}
        >
          {item.body}
        </AppText>
      </View>
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
      {/* Header. Same background as the conversation itself, not a tinted
          toolbar — a chat is a room you are in, not a screen you are
          operating. A hairline does the separating instead of a fill, so
          the name reads as a name and not as a title bar. It stays opaque
          so messages scroll underneath rather than showing through. */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: theme.colors.outlineVariant,
            paddingTop: insets.top + Spacing.SPACING_PADDING_8,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t(Common.A11Y_BACK)}
          hitSlop={12}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
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
            <Image source={{ uri: avatar }} style={styles.headerAvatar} />
          ) : (
            <View
              style={[
                styles.headerAvatar,
                styles.headerAvatarFallback,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
          <AppText
            variant="h3"
            style={{
              color: theme.colors.onBackground,
              marginLeft: Spacing.SPACING_PADDING_8,
            }}
          >
            {name ?? t(Translations.CHAT_TITLE_FALLBACK)}
          </AppText>
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
                marginTop: Spacing.SPACING_PADDING_16,
              }}
            >
              {t(Translations.CHAT_WAKING)}
            </AppText>
          ) : null}
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="message-alert-outline"
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
            borderTopColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              color: theme.colors.onSurface,
            },
          ]}
          placeholder={t(Translations.CHAT_INPUT_PLACEHOLDER)}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <CircleIconButton
          size={40}
          onPress={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          accessibilityLabel={t(Common.A11Y_SEND)}
          style={[
            styles.sendBtn,
            {
              backgroundColor: text.trim()
                ? theme.colors.primary
                : theme.colors.outlineVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="send"
            size={20}
            color={
              text.trim()
                ? theme.colors.onPrimary
                : theme.colors.onSurfaceVariant
            }
          />
        </CircleIconButton>
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
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.SPACING_PADDING_16,
  },
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_16,
    paddingBottom: Spacing.SPACING_PADDING_16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: Spacing.SPACING_PADDING_16,
    paddingVertical: Spacing.SPACING_PADDING_8,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.SPACING_PADDING_16,
    paddingVertical: Spacing.SPACING_PADDING_8,
    borderRadius: BorderRadius.lg,
    marginVertical: 4,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.SPACING_PADDING_8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.SPACING_PADDING_16,
    paddingVertical: Spacing.SPACING_PADDING_8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendBtn: {
    marginLeft: Spacing.SPACING_PADDING_8,
  },
});
