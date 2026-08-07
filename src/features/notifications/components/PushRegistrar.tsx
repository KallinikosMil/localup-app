import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { usePushRegistration } from '@features/notifications/hooks/usePushRegistration';
import { RootState } from '@store';

type PushData = { matchId?: string };

// Renders nothing. It exists so the registration hook and the tap handler
// sit inside the Redux Provider and the router, which the hooks in
// AppProviders deliberately live above.
export default function PushRegistrar() {
  usePushRegistration();

  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const router = useRouter();
  // A cold start hands us the same response again on every mount, so it is
  // consumed once and then ignored — otherwise re-opening the app would
  // keep yanking the user back into that chat.
  const coldStartHandled = useRef(false);

  useEffect(() => {
    if (!uid) return;

    const open = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as
        PushData | undefined;
      if (data?.matchId) router.push(`/chat/${data.matchId}`);
    };

    const openColdStart = async () => {
      if (coldStartHandled.current) return;
      coldStartHandled.current = true;
      open(await Notifications.getLastNotificationResponseAsync());
    };
    void openColdStart();

    const subscription =
      Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [uid, router]);

  return null;
}
