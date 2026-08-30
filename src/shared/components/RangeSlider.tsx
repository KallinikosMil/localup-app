import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { runOnJS } from 'react-native-reanimated';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

// One and two-handled sliders, built here rather than pulled in.
//
// @react-native-community/slider is single-handled, and the age filter needs
// a range — so a dependency would have covered half the screen and still
// left the other half to write. This uses gesture-handler and Reanimated,
// both already in the app, so it costs no new native module and no rebuild
// of anyone's dev client.
//
// The value lives in React state, not a shared value. These handles move in
// whole units across a few hundred pixels — a step is several pixels wide,
// so there is no per-frame precision to protect, and keeping the number in
// React is what lets the count and the warning above react to it as it
// moves.

type Bounds = { min: number; max: number };

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

const HANDLE = Layout.SLIDER_HANDLE;

type TrackProps = {
  bounds: Bounds;
  // Fraction of the track each handle sits at, 0-1.
  fillFrom: number;
  fillTo: number;
  children: React.ReactNode;
  onLayoutWidth: (w: number) => void;
};

const Track = ({
  bounds: _bounds,
  fillFrom,
  fillTo,
  children,
  onLayoutWidth,
}: TrackProps) => {
  const theme = useAppTheme();
  return (
    <View
      // GestureDetector's direct child must survive view flattening. This
      // View has no props React Native considers "interesting", so the
      // optimiser removes it from the native tree and the detector ends up
      // attached to nothing — it warned about exactly this at runtime.
      collapsable={false}
      style={styles.track}
      onLayout={e => onLayoutWidth(e.nativeEvent.layout.width)}
    >
      <View
        style={[styles.rail, { backgroundColor: theme.colors.outlineVariant }]}
      />
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.rail,
          {
            left: `${fillFrom * 100}%`,
            right: `${(1 - fillTo) * 100}%`,
          },
        ]}
      />
      {children}
    </View>
  );
};

const Handle = ({ at }: { at: number }) => {
  const theme = useAppTheme();
  return (
    <View
      pointerEvents="none"
      style={[
        styles.handle,
        {
          left: `${at * 100}%`,
          // onGradient, NOT colors.WHITE — that token is the elevated
          // SURFACE and resolves to #27252B in dark, which would put a
          // near-black handle on a near-black bar. The artboards draw the
          // handle white in both themes, which is what onGradient means.
          backgroundColor: theme.colors.onGradient,
          borderColor: theme.colors.gradientEnd,
        },
      ]}
    />
  );
};

const Ends = ({ from, to }: { from: string; to: string }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.ends}>
      <AppText variant="micro" style={{ color: theme.colors.onSurfaceFaint }}>
        {from}
      </AppText>
      <AppText variant="micro" style={{ color: theme.colors.onSurfaceFaint }}>
        {to}
      </AppText>
    </View>
  );
};

// ---------------------------------------------------------------------------

export const SingleSlider = ({
  value,
  bounds,
  step = 1,
  onChange,
  formatEnd,
  accessibilityLabel,
}: {
  value: number;
  bounds: Bounds;
  step?: number;
  onChange: (next: number) => void;
  formatEnd: (v: number) => string;
  accessibilityLabel: string;
}) => {
  const [width, setWidth] = useState(0);
  const span = bounds.max - bounds.min;
  const at = span > 0 ? (value - bounds.min) / span : 0;

  const set = useCallback(
    (x: number) => {
      if (width <= 0) return;
      const raw = bounds.min + (clamp(x, 0, width) / width) * span;
      onChange(clamp(Math.round(raw / step) * step, bounds.min, bounds.max));
    },
    [width, span, step, bounds.min, bounds.max, onChange],
  );

  // Begin as well as update, so a tap anywhere on the track jumps there
  // rather than requiring a drag from the handle — the handle is 26pt and
  // the track is the whole width.
  const pan = Gesture.Pan()
    .onBegin(e => runOnJS(set)(e.x))
    .onUpdate(e => runOnJS(set)(e.x));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: bounds.min, max: bounds.max, now: value }}
      onAccessibilityAction={e => {
        if (e.nativeEvent.actionName === 'increment') {
          onChange(clamp(value + step, bounds.min, bounds.max));
        } else if (e.nativeEvent.actionName === 'decrement') {
          onChange(clamp(value - step, bounds.min, bounds.max));
        }
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    >
      <GestureDetector gesture={pan}>
        <Track
          bounds={bounds}
          fillFrom={0}
          fillTo={at}
          onLayoutWidth={setWidth}
        >
          <Handle at={at} />
        </Track>
      </GestureDetector>
      <Ends from={formatEnd(bounds.min)} to={formatEnd(bounds.max)} />
    </View>
  );
};

export const DualSlider = ({
  low,
  high,
  bounds,
  step = 1,
  onChange,
  formatEnd,
  accessibilityLabel,
}: {
  low: number;
  high: number;
  bounds: Bounds;
  step?: number;
  onChange: (nextLow: number, nextHigh: number) => void;
  formatEnd: (v: number) => string;
  accessibilityLabel: string;
}) => {
  const [width, setWidth] = useState(0);
  const span = bounds.max - bounds.min;
  const lowAt = span > 0 ? (low - bounds.min) / span : 0;
  const highAt = span > 0 ? (high - bounds.min) / span : 1;

  const set = useCallback(
    (x: number) => {
      if (width <= 0) return;
      const raw = bounds.min + (clamp(x, 0, width) / width) * span;
      const v = clamp(Math.round(raw / step) * step, bounds.min, bounds.max);
      // Whichever handle is nearer to the touch is the one that moves, and
      // neither may cross the other — a range whose ends have swapped is a
      // filter that matches nobody, silently.
      if (Math.abs(v - low) <= Math.abs(v - high)) {
        onChange(Math.min(v, high), high);
      } else {
        onChange(low, Math.max(v, low));
      }
    },
    [width, span, step, bounds.min, bounds.max, low, high, onChange],
  );

  const pan = Gesture.Pan()
    .onBegin(e => runOnJS(set)(e.x))
    .onUpdate(e => runOnJS(set)(e.x));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: `${low} – ${high}` }}
    >
      <GestureDetector gesture={pan}>
        <Track
          bounds={bounds}
          fillFrom={lowAt}
          fillTo={highAt}
          onLayoutWidth={setWidth}
        >
          <Handle at={lowAt} />
          <Handle at={highAt} />
        </Track>
      </GestureDetector>
      <Ends from={formatEnd(bounds.min)} to={formatEnd(bounds.max)} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: HANDLE,
    justifyContent: 'center',
    marginTop: Spacing.lg - 2,
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: Layout.SLIDER_RAIL,
    borderRadius: Layout.SLIDER_RAIL / 2,
  },
  handle: {
    position: 'absolute',
    top: 0,
    width: HANDLE,
    height: HANDLE,
    marginLeft: -HANDLE / 2,
    borderRadius: HANDLE / 2,
    borderWidth: 2,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
});
