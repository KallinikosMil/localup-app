import React, { useState } from 'react';
import { StyleSheet, View, Image, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import { type Photo } from '@features/profile/hooks/useProfile';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/profile/i18n/translationKeys';
import { Translations as Common } from '@shared/i18n/translationKeys';

// The six photo slots, drag to reorder.
//
// Position 0 IS the main photo — there is no separate flag, which is the
// whole point of the `position` column: two sources of truth for "which
// one is first" is how they drift apart. Moving a photo to slot 1 is how
// you change what Discover shows, and the MAIN tag says so.
//
// Reordering commits through `reorder_photos`, which rewrites every
// position in ONE statement. A per-photo update would leave duplicate
// positions if it failed halfway, and the grid would render in a
// nondeterministic order from then on.

const COLUMNS = 3;
const TILE_HEIGHT = 148;
const GAP = 9;

type PhotoGridProps = {
  photos: Photo[];
  maxSlots?: number;
  onAdd: () => void;
  onRemove: (photo: Photo) => void;
  // Receives the full list in its new order. Never a partial list — the
  // RPC refuses one, deliberately.
  onReorder: (ids: string[]) => void;
  busy?: boolean;
};

const PhotoGrid = ({
  photos,
  maxSlots = 6,
  onAdd,
  onRemove,
  onReorder,
  busy = false,
}: PhotoGridProps) => {
  const theme = useAppTheme();
  const { t } = useTranslation();

  // Measured, not assumed: the grid is inside a screen whose gutter can
  // change, and a hard-coded tile width would only be right on one phone.
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth =
    gridWidth > 0 ? (gridWidth - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  // The order being dragged, so the grid can reflow under the finger
  // before anything is committed.
  const [order, setOrder] = useState<Photo[] | null>(null);
  const live = order ?? photos;

  const emptySlots = Math.max(maxSlots - live.length, 0);

  const slotPosition = (index: number) => ({
    x: (index % COLUMNS) * (tileWidth + GAP),
    y: Math.floor(index / COLUMNS) * (TILE_HEIGHT + GAP),
  });

  const rows = Math.ceil(Math.max(live.length + emptySlots, 1) / COLUMNS);

  const commit = (next: Photo[]) => {
    setOrder(null);
    // Nothing moved — do not spend a round trip saying so.
    if (next.every((p, i) => p.id === photos[i]?.id)) return;
    onReorder(next.map(p => p.id));
  };

  return (
    <View
      style={[
        styles.grid,
        {
          height: rows * TILE_HEIGHT + (rows - 1) * GAP,
        },
      ]}
      onLayout={e => setGridWidth(e.nativeEvent.layout.width)}
    >
      {tileWidth > 0
        ? live.map((photo, index) => (
            <DraggableTile
              key={photo.id}
              photo={photo}
              index={index}
              count={live.length}
              tileWidth={tileWidth}
              slotPosition={slotPosition}
              disabled={busy || live.length < 2}
              onRemove={() => onRemove(photo)}
              onDrop={targetIndex => {
                if (targetIndex === index) {
                  setOrder(null);
                  return;
                }
                const next = [...live];
                const [moved] = next.splice(index, 1);
                next.splice(targetIndex, 0, moved);
                commit(next);
              }}
              isMain={index === 0}
              theme={theme}
              t={t}
            />
          ))
        : null}

      {tileWidth > 0
        ? Array.from({ length: emptySlots }, (_, i) => {
            const index = live.length + i;
            const { x, y } = slotPosition(index);
            return (
              <Pressable
                key={`empty-${index}`}
                onPress={onAdd}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t(Common.A11Y_ADD_PHOTO)}
                style={[
                  styles.tile,
                  styles.empty,
                  {
                    left: x,
                    top: y,
                    width: tileWidth,
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.outlineDashed,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={24}
                  color={theme.colors.onSurfaceFaint}
                />
              </Pressable>
            );
          })
        : null}
    </View>
  );
};

type TileProps = {
  photo: Photo;
  index: number;
  count: number;
  tileWidth: number;
  slotPosition: (index: number) => { x: number; y: number };
  disabled: boolean;
  isMain: boolean;
  onRemove: () => void;
  onDrop: (targetIndex: number) => void;
  theme: ReturnType<typeof useAppTheme>;
  t: ReturnType<typeof useTranslation>['t'];
};

const DraggableTile = ({
  photo,
  index,
  count,
  tileWidth,
  slotPosition,
  disabled,
  isMain,
  onRemove,
  onDrop,
  theme,
  t,
}: TileProps) => {
  const home = slotPosition(index);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const lifted = useSharedValue(0);

  // Long press first, then drag. A bare pan would fight the scroll view
  // this grid lives in, and every attempt to scroll past the photos would
  // pick one up instead.
  const drag = Gesture.Pan()
    .activateAfterLongPress(200)
    .enabled(!disabled)
    .onStart(() => {
      lifted.value = withSpring(1);
    })
    .onUpdate(e => {
      dx.value = e.translationX;
      dy.value = e.translationY;
    })
    .onEnd(() => {
      // Which slot the tile's centre is closest to, clamped to the number
      // of real photos — dropping onto an empty slot means "put it last",
      // not "leave a hole at position 3".
      const col = Math.round((home.x + dx.value) / (tileWidth + GAP));
      const row = Math.round((home.y + dy.value) / (TILE_HEIGHT + GAP));
      const raw = row * COLUMNS + col;
      const target = Math.min(Math.max(raw, 0), count - 1);
      runOnJS(onDrop)(target);
    })
    .onFinalize(() => {
      dx.value = withSpring(0);
      dy.value = withSpring(0);
      lifted.value = withSpring(0);
    });

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx.value },
      { translateY: dy.value },
      { scale: 1 + lifted.value * 0.06 },
    ],
    // A lifted tile has to sit above its neighbours or it slides
    // underneath them and looks like it fell through the grid.
    zIndex: lifted.value > 0 ? 10 : 1,
    elevation: lifted.value > 0 ? 10 : 1,
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          styles.tile,
          {
            left: home.x,
            top: home.y,
            width: tileWidth,
          },
          animated,
        ]}
      >
        <Image source={{ uri: photo.url }} style={styles.image} />

        {isMain ? (
          <View
            style={[
              styles.mainTag,
              {
                backgroundColor: theme.colors.gradientEnd,
              },
            ]}
          >
            <AppText
              variant="nano"
              style={{
                color: theme.colors.onGradient,
              }}
            >
              {t(Translations.PROFILE_PHOTO_MAIN)}
            </AppText>
          </View>
        ) : null}

        {/* Drawn at 22px but padded out to a 44px target — a remove
            control you can miss and hit the photo instead is how a photo
            gets deleted by accident. */}
        <Pressable
          onPress={onRemove}
          hitSlop={11}
          accessibilityRole="button"
          // Six identical "Remove photo" buttons tell a screen-reader
          // user nothing about which one they are on. The tile already
          // knows its index and the count.
          accessibilityLabel={t(Translations.PROFILE_PHOTO_REMOVE_NTH, {
            position: index + 1,
            total: count,
          })}
          style={[
            styles.remove,
            {
              backgroundColor: theme.colors.BLACK_A75,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="close"
            size={11}
            color={theme.colors.ON_PHOTO}
          />
        </Pressable>

        {isMain ? (
          <View
            style={[
              styles.mainRing,
              {
                borderColor: theme.colors.gradientEnd,
              },
            ]}
            pointerEvents="none"
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
};

export default PhotoGrid;

const styles = StyleSheet.create({
  grid: {
    position: 'relative',
    width: '100%',
  },
  tile: {
    position: 'absolute',
    height: TILE_HEIGHT,
    borderRadius: Layout.FIELD_RADIUS,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTag: {
    position: 'absolute',
    left: Layout.CHIP_GAP,
    bottom: Layout.CHIP_GAP,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs - 1,
    borderRadius: BorderRadius.pill,
  },
  mainRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: Layout.FIELD_RADIUS,
  },
  remove: {
    position: 'absolute',
    right: Layout.CHIP_PADDING_V,
    top: Layout.CHIP_PADDING_V,
    width: Layout.BADGE_SM,
    height: Layout.BADGE_SM,
    borderRadius: Layout.BADGE_SM / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
