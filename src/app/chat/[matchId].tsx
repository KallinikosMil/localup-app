import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '@store';

import AppText from '@shared/components/AppText';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import {
  useChat,
  useSendMessage,
  type ChatMessage,
} from '@features/chat/hooks/useChat';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Translations } from '@features/chat/i18n/translationKeys';

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { matchId, name, threadId } = useLocalSearchParams<{
    matchId: string;
    name: string;
    // Passed from Matches (which already
    // knows it) so the chat skips the
    // thread lookup. Absent on deep links
    // / brand-new matches → resolved in
    // the fallback path.
    threadId?: string;
  }>();
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const { t } = useTranslation();

  const insets = useSafeAreaInsets();
  const errorMessage = useErrorMessage();
  const { messages, isLoading, isError, error, refetch } = useChat(
    matchId,
    threadId ?? null,
  );
  const sendMessage = useSendMessage(matchId);

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
                  backgroundColor: theme.colors.surfaceVariant,
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
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surfaceVariant,
            paddingTop: insets.top + Spacing.SPACING_PADDING_8,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.onBackground}
          />
        </Pressable>
        <AppText
          variant="h3"
          style={{
            color: theme.colors.onBackground,
            marginLeft: Spacing.SPACING_PADDING_16,
          }}
        >
          {name ?? t(Translations.CHAT_TITLE_FALLBACK)}
        </AppText>
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
          <Pressable
            onPress={() => refetch()}
            hitSlop={8}
            style={[
              styles.retryBtn,
              {
                backgroundColor: theme.colors.primary,
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
              {t(Translations.CHAT_RETRY)}
            </AppText>
          </Pressable>
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
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
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
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          style={[
            styles.sendBtn,
            {
              backgroundColor: text.trim()
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
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
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_16,
    paddingBottom: Spacing.SPACING_PADDING_16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
  retryBtn: {
    marginTop: Spacing.SPACING_PADDING_16,
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingVertical: Spacing.SPACING_PADDING_8,
    borderRadius: BorderRadius.pill,
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
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.SPACING_PADDING_8,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.SPACING_PADDING_16,
    paddingVertical: Spacing.SPACING_PADDING_8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.SPACING_PADDING_8,
  },
});
