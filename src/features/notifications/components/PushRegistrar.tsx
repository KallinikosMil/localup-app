import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';

import { Routes } from '@shared/routes';
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
  const queryClient = useQueryClient();
  // A cold start hands us the same response again on every mount, so it is
  // consumed once and then ignored — otherwise re-opening the app would
  // keep yanking the user back into that chat.
  const coldStartHandled = useRef(false);

  useEffect(() => {
    if (!uid) return;

    const open = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as
        PushData | undefined;
      // The pattern plus params, not an interpolated path. Both navigate
      // today, but only this form survives the route being renamed —
      // and the constant is what routes.test.ts checks against a real
      // file on every run.
      if (data?.matchId) {
        // A push IS a server signal that this conversation changed, so
        // drop the cache before showing it. Without this, a chat that is
        // already open with a dead realtime channel and a fetch under
        // 30s old would show the notification's message only after the
        // person sent one themselves — refetchOnMount cannot help when
        // the screen never remounts.
        queryClient.invalidateQueries({
          queryKey: ['chat', data.matchId],
        });

        // dismissTo, NOT push and not navigate. A tapped notification used
        // to add another chat screen every time, even when that very
        // conversation was already open — ten notifications, ten
        // identical screens, ten presses of back to escape. Reported on a
        // Samsung as "the screens are piled up".
        //
        // navigate was the first fix and does not do it: expo-router 6
        // reuses a route only when it is the CURRENT top. dismissTo pops
        // back to the chat wherever it sits in the stack, and pushes only
        // when it is not there at all.
        router.dismissTo({
          pathname: Routes.chat,
          params: { matchId: data.matchId },
        });
      }
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
