import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

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
