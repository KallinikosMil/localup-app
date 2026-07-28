import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

// Nothing in this app recovers from being backgrounded.
//
// Observed 2026-07-28: an app left open for ~2 days received NO realtime
// event for a message that was definitely inserted — the Matches preview
// and the unread badge stayed on stale data indefinitely. A relaunch
// showed everything instantly, and on that fresh socket the next message
// arrived in ~3s. So the websocket does not survive a long sleep and
// nothing re-establishes it.
//
// Two independent gaps, both fixed here:
//
//  1. DATA — react-query's `refetchOnWindowFocus` (on by default) is
//     driven by `focusManager`, which on React Native is never told
//     anything unless you wire it to AppState yourself. Tabs also keep
//     screens mounted, so `refetchOnMount` never fires either. Result:
//     a returning user sees whatever was cached, forever.
//
//  2. SOCKET — the realtime channels are created in `useEffect`s keyed on
//     ids only, so they are never rebuilt. Consumers add the epoch below
//     to those deps: on return to foreground the effect's existing
//     cleanup removes the dead channel and subscribes a fresh one, with
//     no new teardown logic to get wrong.
//
// Deliberately counts only background→active transitions. `AppState`
// also emits 'inactive' for transient interruptions (notification shade,
// incoming call); reacting to those would re-subscribe constantly.

let epoch = 0;
const listeners = new Set<() => void>();
let previous: AppStateStatus = AppState.currentState;
let wired = false;

const wire = () => {
  if (wired) return;
  wired = true;
  AppState.addEventListener('change', next => {
    // Drives refetchOnWindowFocus for every query in the app.
    focusManager.setFocused(next === 'active');

    const returned = /inactive|background/.test(previous) && next === 'active';
    previous = next;
    if (!returned) return;

    epoch += 1;
    listeners.forEach(notify => notify());
  });
};

const subscribe = (onChange: () => void) => {
  wire();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

const read = () => epoch;

// Increments once each time the app comes back to the foreground. Put it
// in the dependency array of an effect that owns a realtime channel and
// the channel is rebuilt on return.
export const useForegroundEpoch = () =>
  useSyncExternalStore(subscribe, read, read);
