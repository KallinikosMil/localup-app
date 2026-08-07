import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';

// Tells the OS what to do with a notification that arrives while the app
// is already open. Module scope on purpose — expo-notifications wants this
// set before any notification can be delivered, not on first render.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const pushLog = (...args: unknown[]) => {
  if (__DEV__) console.log('[push]', ...args);
};

// Remote push does not exist in Expo Go on Android any more: Expo Go is a
// single published app sharing one FCM sender across every project, so the
// token it handed out was never really ours. A development build is our
// own app with our own credentials, which is also what production looks
// like. Detect the sandbox and skip quietly rather than throwing — the app
// still has to run in Expo Go for everything else.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Android will not display anything unless a channel exists first. Doing
// this before requesting permission means the very first notification
// already lands in a configured channel.
const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Messages and matches',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#653FD4',
  });
};

// Asks only if we have not been answered before. Re-prompting a user who
// said no is both pointless (the OS will not show the dialog again) and
// the reason apps get muted for good.
const ensurePermission = async () => {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) {
    pushLog('permission previously denied and not re-askable');
    return false;
  }
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
};

// Registers this device against the signed-in account, and hands it over
// on sign-out so the next person to use the handset does not receive the
// previous one's messages.
export const usePushRegistration = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  // Survives the effect so the cleanup can unregister the exact token it
  // registered, even though the token itself is fetched asynchronously.
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    const register = async () => {
      if (isExpoGo) {
        pushLog('skipped: Expo Go cannot receive remote push');
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) {
        pushLog('skipped: no EAS projectId — run `eas init`');
        return;
      }

      try {
        await ensureAndroidChannel();
        if (cancelled) return;

        if (!(await ensurePermission())) {
          pushLog('skipped: permission not granted');
          return;
        }
        if (cancelled) return;

        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        if (cancelled) return;
        tokenRef.current = token;

        // Through an RPC rather than a table write: claiming a token is a
        // handover, and the table has no UPDATE grant precisely so that a
        // filtered PATCH cannot reassign somebody else's device.
        const { error } = await supabase.rpc('register_push_token', {
          p_token: token,
          p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
        if (error) {
          pushLog('register failed', error.message);
          return;
        }
        pushLog('registered', token);
      } catch (e) {
        // Never fatal. A device that cannot receive push is a device that
        // gets no notifications, not a device that cannot use the app.
        pushLog('registration error', (e as Error).message);
      }
    };

    void register();

    return () => {
      cancelled = true;
      const token = tokenRef.current;
      if (!token) return;
      tokenRef.current = null;
      // Fire-and-forget: the session may already be gone, in which case
      // RLS drops it and the row is reclaimed by whoever signs in next.
      void supabase.from('push_tokens').delete().eq('token', token);
    };
  }, [uid]);
};
