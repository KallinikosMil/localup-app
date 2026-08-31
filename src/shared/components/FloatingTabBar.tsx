import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import AppText from '@shared/components/AppText';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

// The redesign floats the tab bar over the photo instead of docking a bar
// at the bottom of the window, so the hero really does run to the edge.
//
// This is the clearest case of "light mode is not a token swap" in the
// whole design: the active segment is a SOLID WHITE pill in dark and a
// VIOLET GRADIENT pill in light. Swapping tokens alone would paint a
// white pill on a white bar, which is invisible — so the shape itself
// branches on the resolved theme, and only the label colour is a token.

const ICON_ACTIVE = 20;
const ICON_INACTIVE = 21;
// Shared with Discover, which has to reserve exactly this much room —
// the bar floats over the content instead of taking layout space.
const SEGMENT_HEIGHT = Layout.TAB_SEGMENT_HEIGHT;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, IconName> = {
  discover: 'compass-outline',
  matches: 'chat-outline',
  profile: 'account-outline',
};

// Which tabs put a PHOTO behind THE BAR. Over an image the bar frosts so
// the photo keeps showing through; over an ordinary page it becomes a
// solid card with a hairline, because frosted glass on a flat surface
// just looks like a mistake.
//
// Note this is not the same question as "is the screen full-bleed".
// Profile's hero runs edge to edge too, but the bar sits far below it on
// the page background — so Profile is NOT in this list.
//
// Keyed by route name rather than read from screen options: React
// Navigation has no typed slot for a custom option, and one list of names
// beats casting `options` to `any` at the read site.
const PHOTO_BACKED_TABS = ['discover'];

const FloatingTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const onPhoto = PHOTO_BACKED_TABS.includes(state.routes[state.index].name);
  const barSurface = onPhoto
    ? theme.colors.tabBarSurface
    : theme.colors.surfaceElevated;
  const barBorder = onPhoto
    ? theme.colors.tabBarBorder
    : theme.colors.outlineVariant;
  const inactiveTint = onPhoto
    ? theme.colors.onTabInactive
    : theme.colors.outline;

  return (
    <View
      style={[
        styles.wrap,
        {
          // The design's 24px sits above the gesture bar, not under it.
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: barSurface,
            borderColor: barBorder,
          },
          // Light gets a cast shadow because its bar is opaque and has to
          // lift off what is behind it; in dark the bar is already either
          // frosted or a raised surface, and a shadow adds nothing.
          theme.dark ? null : styles.barShadow,
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.title === 'string' ? options.title : route.name;
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (focused) {
            const content = (
              <>
                <MaterialCommunityIcons
                  importantForAccessibility="no"
                  accessibilityElementsHidden
                  name={ICONS[route.name] ?? 'circle-outline'}
                  size={ICON_ACTIVE}
                  color={theme.colors.onTabActive}
                />
                <AppText
                  variant="labelStrong"
                  style={{
                    color: theme.colors.onTabActive,
                  }}
                >
                  {label}
                </AppText>
              </>
            );

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: true }}
              >
                {theme.dark ? (
                  <View
                    style={[
                      styles.activeSegment,
                      {
                        backgroundColor: theme.colors.tabActiveSurface,
                      },
                    ]}
                  >
                    {content}
                  </View>
                ) : (
                  <LinearGradient
                    colors={[
                      theme.colors.gradientStart,
                      theme.colors.gradientEnd,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.activeSegment}
                  >
                    {content}
                  </LinearGradient>
                )}
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              // The badge is drawn, never spoken — so the one piece of
              // information the bar carries beyond navigation was
              // invisible to a screen reader. It rides on the tab's own
              // label rather than as a separate node, which would just be
              // a stray number after the tab name.
              accessibilityLabel={
                badge
                  ? t(Common.A11Y_TAB_WITH_UNREAD, {
                      label,
                      count: Number(badge),
                    })
                  : label
              }
              accessibilityState={{ selected: false }}
              style={styles.inactiveSegment}
            >
              <MaterialCommunityIcons
                importantForAccessibility="no"
                accessibilityElementsHidden
                name={ICONS[route.name] ?? 'circle-outline'}
                size={ICON_INACTIVE}
                color={inactiveTint}
              />
              {badge ? (
                <View
                  style={[
                    styles.badge,
                    {
                      // The ring hides the badge's seam against whatever
                      // the bar itself is painted in, so it tracks the
                      // bar rather than being its own token.
                      borderColor: barSurface,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.gradientStart,
                      theme.colors.gradientEnd,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <AppText
                    variant="microStrong"
                    style={{
                      color: theme.colors.onGradient,
                    }}
                  >
                    {String(badge)}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default FloatingTabBar;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.TAB_BAR_GAP,
    padding: Layout.TAB_BAR_PADDING,
    borderRadius: Layout.TAB_BAR_RADIUS,
    borderWidth: 1,
  },
  barShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 26,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 12,
  },
  activeSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.CHIP_GAP,
    height: SEGMENT_HEIGHT,
    paddingHorizontal: Layout.TAB_SEGMENT_PADDING_H,
    borderRadius: Layout.BUTTON_LG_RADIUS,
  },
  inactiveSegment: {
    width: SEGMENT_HEIGHT,
    height: SEGMENT_HEIGHT,
    borderRadius: SEGMENT_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: Layout.BADGE_TAB,
    height: Layout.BADGE_TAB,
    borderRadius: Layout.BADGE_TAB / 2,
    borderWidth: Layout.BADGE_BORDER,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.BADGE_PADDING_TAB,
  },
});
