import React, {
  useState,
  useRef,
  useEffect,
} from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import {
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

import AppText from
  '@shared/components/AppText';
import {
  useChat,
  useSendMessage,
  type ChatMessage,
} from
  '@features/chat/hooks/useChat';
import { Spacing } from
  '@theme/constants/Spacing';
import { BorderRadius } from
  '@theme/constants/BorderRadius';

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { matchId, name, threadId } =
    useLocalSearchParams<{
      matchId: string;
      name: string;
      // Passed from Matches (which already
      // knows it) so the chat skips the
      // thread lookup. Absent on deep links
      // / brand-new matches → resolved in
      // the fallback path.
      threadId?: string;
    }>();
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );

  const insets = useSafeAreaInsets();
  const {
    messages,
    isLoading,
    isError,
    refetch,
  } = useChat(matchId, threadId ?? null);
  const sendMessage =
    useSendMessage(matchId);

  const [text, setText] = useState('');
  const listRef =
    useRef<FlatList>(null);

  // After a few seconds of loading, reassure the user the screen
  // isn't frozen — a Supabase project waking from auto-pause can
  // take 10-20s (V4). Resets whenever loading ends.
  const [slowLoading, setSlowLoading] =
    useState(false);
  useEffect(() => {
    if (!isLoading) {
      setSlowLoading(false);
      return;
    }
    const t = setTimeout(
      () => setSlowLoading(true),
      4500,
    );
    return () => clearTimeout(t);
  }, [isLoading]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    sendMessage.mutate(trimmed);
  };

  const renderMessage = ({
    item,
  }: {
    item: ChatMessage;
  }) => {
    const isMine =
      item.sender_id === uid;
    return (
      <View
        style={[
          styles.bubble,
          isMine
            ? [
                styles.bubbleMine,
                {
                  backgroundColor:
                    theme.colors.primary,
                },
              ]
            : [
                styles.bubbleTheirs,
                {
                  backgroundColor:
                    theme.colors
                      .surfaceVariant,
                },
              ],
        ]}
      >
        <AppText
          variant="body"
          style={{
            color: isMine
              ? theme.colors.onPrimary
              : theme.colors
                  .onSurface,
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
          backgroundColor:
            theme.colors.background,
        },
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
      keyboardVerticalOffset={
        Platform.OS === 'ios' ? 90 : 0
      }
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor:
              theme.colors
                .surfaceVariant,
            paddingTop:
              insets.top +
              Spacing.SPACING_PADDING_8,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={
              theme.colors.onBackground
            }
          />
        </Pressable>
        <AppText
          variant="h3"
          style={{
            color:
              theme.colors.onBackground,
            marginLeft:
              Spacing.SPACING_PADDING_16,
          }}
        >
          {name ?? 'Chat'}
        </AppText>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator
            animating
            size="large"
          />
          {slowLoading && (
            <AppText
              variant="body"
              style={{
                color:
                  theme.colors
                    .onSurfaceVariant,
                textAlign: 'center',
                marginTop:
                  Spacing.SPACING_PADDING_16,
              }}
            >
              Waking the server…
            </AppText>
          )}
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="message-alert-outline"
            size={40}
            color={
              theme.colors
                .onSurfaceVariant
            }
          />
          <AppText
            variant="body"
            style={{
              color:
                theme.colors
                  .onSurfaceVariant,
              textAlign: 'center',
              marginTop:
                Spacing.SPACING_PADDING_12,
            }}
          >
            Couldn&apos;t load this
            conversation.
          </AppText>
          <Pressable
            onPress={() => refetch()}
            hitSlop={8}
            style={[
              styles.retryBtn,
              {
                backgroundColor:
                  theme.colors.primary,
              },
            ]}
          >
            <AppText
              variant="body"
              style={{
                color:
                  theme.colors.onPrimary,
                fontWeight: '600',
              }}
            >
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={
            styles.list
          }
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
                  color:
                    theme.colors
                      .onSurfaceVariant,
                  textAlign: 'center',
                }}
              >
                No messages yet.{'\n'}
                Say hello!
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
            backgroundColor:
              theme.colors
                .surfaceVariant,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                theme.colors.surface,
              color:
                theme.colors.onSurface,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={
            theme.colors.onSurfaceVariant
          }
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          onPress={handleSend}
          disabled={
            !text.trim() ||
            sendMessage.isPending
          }
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                text.trim()
                  ? theme.colors.primary
                  : theme.colors
                      .surfaceVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="send"
            size={20}
            color={
              text.trim()
                ? theme.colors.onPrimary
                : theme.colors
                    .onSurfaceVariant
            }
          />
        </Pressable>
      </View>
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
    paddingHorizontal:
      Spacing.SPACING_PADDING_16,
    paddingBottom:
      Spacing.SPACING_PADDING_16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
  },
  retryBtn: {
    marginTop:
      Spacing.SPACING_PADDING_16,
    paddingHorizontal:
      Spacing.SPACING_PADDING_24,
    paddingVertical:
      Spacing.SPACING_PADDING_8,
    borderRadius: BorderRadius.pill,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal:
      Spacing.SPACING_PADDING_16,
    paddingVertical:
      Spacing.SPACING_PADDING_8,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal:
      Spacing.SPACING_PADDING_16,
    paddingVertical:
      Spacing.SPACING_PADDING_8,
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
    paddingHorizontal:
      Spacing.SPACING_PADDING_16,
    paddingVertical:
      Spacing.SPACING_PADDING_8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft:
      Spacing.SPACING_PADDING_8,
  },
});
