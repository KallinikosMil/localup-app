import { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { BorderRadius } from '@theme/constants/BorderRadius';

// Long enough that a photo cannot be lost to a pocket-press or to a finger
// resting on the grid mid-scroll; short enough to still feel like a gesture
// rather than a wait. The confirm dialog behind it is the real safety net —
// this is about not being *asked* by accident.
export const HOLD_TO_REMOVE_MS = 3000;

type Props = {
  uri: string;
  size: number;
  background: string;
  onRemove: () => void;
};

export default function GalleryPhoto({
  uri,
  size,
  background,
  onRemove,
}: Props) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const hold = useRef<Animated.CompositeAnimation | null>(null);

  // Three seconds of nothing reads as a dead control: people let go after
  // one and conclude the photo cannot be removed. The dim and the bar are
  // what turn the delay into a deliberate action instead of a bug.
  const startHold = () => {
    hold.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_TO_REMOVE_MS,
      // width cannot be driven natively, and it shares this value with the
      // dim, so both stay on the JS driver.
      useNativeDriver: false,
    });
    hold.current.start();
  };

  const cancelHold = () => {
    hold.current?.stop();
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Pressable
      onPressIn={startHold}
      onPressOut={cancelHold}
      delayLongPress={HOLD_TO_REMOVE_MS}
      onLongPress={() => {
        // Reset before asking, so the bar is not left full behind the
        // dialog — and is empty again if they cancel.
        cancelHold();
        onRemove();
      }}
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: background },
      ]}
    >
      <Image source={{ uri }} style={styles.img} />

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000',
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.45],
            }),
          },
        ]}
      />

      <View style={styles.track} pointerEvents="none">
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: theme.colors.error,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  fill: {
    height: '100%',
  },
});
