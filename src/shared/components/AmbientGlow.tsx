import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

import { useAppTheme } from '@theme/paper';
import { Layout } from '@theme/constants/Layout';

// The violet blob behind the top-left corner (§3.3). Violet as LIGHT
// rather than paint — it is the one thing in the design that says "this
// app has a colour" on a screen with no photo on it.
//
// It has to be a RADIAL gradient. Drawn as a flat circle it has a hard
// edge, and a hard-edged lilac disc on a near-white page reads as a
// rendering fault rather than as light.
//
// The colour is the brand violet and the OPACITY is what changes per
// theme: dark runs it at 0.42, light at roughly a quarter of that, or
// the page turns lilac. They are separate because SVG stop-color has no
// alpha channel — passing an rgba() there is read as fully opaque, which
// is exactly how this first shipped: a solid violet disc.

type AmbientGlowProps = {
  size?: number;
  x?: number;
  y?: number;
};

const AmbientGlow = ({
  size = Layout.GLOW_SIZE,
  x = Layout.GLOW_OFFSET_X,
  y = Layout.GLOW_OFFSET_Y,
}: AmbientGlowProps) => {
  const theme = useAppTheme();
  const opacity = theme.dark
    ? Layout.GLOW_OPACITY_DARK
    : Layout.GLOW_OPACITY_LIGHT;

  return (
    <View
      style={[
        styles.wrap,
        {
          left: x,
          top: y,
          width: size,
          height: size,
        },
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="ambientGlow" cx="50%" cy="50%" r="50%">
            <Stop
              offset="0%"
              stopColor={theme.colors.gradientEnd}
              stopOpacity={opacity}
            />
            {/* Fades out well before the edge, so there is never a visible
                boundary — the same 70% the artboards use. */}
            <Stop
              offset="70%"
              stopColor={theme.colors.gradientEnd}
              stopOpacity={0}
            />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#ambientGlow)" />
      </Svg>
    </View>
  );
};

export default AmbientGlow;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
});
