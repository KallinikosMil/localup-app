import React from 'react';
import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from '@shared/components/AppText';
import { useAppTheme, type AppTheme } from '@theme/paper';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Layout } from '@theme/constants/Layout';

// The pieces the Edit screen is built from.
//
// They deliberately do NOT reuse the shared InputField: that one is bound
// to react-hook-form, and this screen edits live values against a dirty
// flag rather than submitting a form. Wiring RHF in just to borrow a box
// would be the tail wagging the dog. The SHAPES are shared — same height,
// radius, border and label treatment — so the two read as one system.

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// Sections are separated by a rule, not by a tinted card each. Five
// stacked cards on one scrolling page read as five unrelated screens; a
// hairline says "same page, next thing".
export const Section = ({
  title,
  trailing,
  children,
}: {
  title: string;
  // A counter or status on the right of the section label — '3 of 6'.
  // Baseline-aligned with the label, not centred.
  trailing?: string;
  children: React.ReactNode;
}) => {
  const theme = useAppTheme();
  return (
    <View>
      <View style={styles.sectionHeader}>
        <AppText
          variant="overline"
          style={{
            color: theme.colors.onSurfaceFaint,
          }}
        >
          {title}
        </AppText>
        {trailing ? (
          <AppText
            variant="micro"
            style={{
              color: theme.colors.onSurfaceFaint,
            }}
          >
            {trailing}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
};

export const SectionRule = () => {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.rule,
        {
          backgroundColor: theme.colors.outlineVariant,
        },
      ]}
    />
  );
};

export const LabelledField = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: IconName;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const theme = useAppTheme();
  return (
    <View>
      <AppText
        variant="caption"
        style={[
          styles.label,
          {
            color: theme.colors.onSurfaceFaint,
          },
        ]}
      >
        {label}
      </AppText>
      <View
        style={[
          styles.box,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={Layout.FIELD_ICON}
          color={theme.colors.onSurfaceFaint}
        />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceFaint}
          // Same reason as InputField: the label is a sibling Text node,
          // so nothing ties it to the box. A placeholder is not a
          // substitute — Android reads the hint only while the field is
          // empty, so a filled field would go back to having no name.
          accessibilityLabel={label}
          style={[
            styles.input,
            Typography.message.style,
            {
              color: theme.colors.onSurface,
            },
          ]}
        />
      </View>
    </View>
  );
};

export type ModeSegmentOption = {
  label: string;
  active: boolean;
  onPress: () => void;
  // Optional, and only Settings passes one. "How you appear" reads as a
  // mode picker from its two words alone; System / Light / Dark does not
  // — three theme words with no glyph could be picking anything.
  icon?: IconName;
};

// A segmented control, not three loose pills: the three are mutually
// exclusive and the track makes that visible before you read a label.
export const ModeSegments = ({
  options,
  theme,
}: {
  options: ModeSegmentOption[];
  theme: AppTheme;
}) => (
  <View
    style={[
      styles.segmented,
      {
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.outlineVariant,
      },
    ]}
  >
    {options.map(option =>
      option.active ? (
        <Pressable
          key={option.label}
          onPress={option.onPress}
          accessibilityRole="button"
          // Explicit, because the icon beside it is a glyph from a font.
          // Without this the composed name came out as the private-use
          // character followed by the word — verified on device, TalkBack
          // announced ", System". The icon is decorative and the
          // label already says everything.
          accessibilityLabel={option.label}
          accessibilityState={{ selected: true }}
          style={styles.segment}
        >
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.segmentFill}
          >
            {option.icon ? (
              <MaterialCommunityIcons
                name={option.icon}
                size={Layout.SEGMENT_ICON}
                color={theme.colors.onGradient}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            ) : null}
            <AppText
              variant="bodySmallStrong"
              style={{
                color: theme.colors.onGradient,
              }}
            >
              {option.label}
            </AppText>
          </LinearGradient>
        </Pressable>
      ) : (
        <Pressable
          key={option.label}
          onPress={option.onPress}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: false }}
          style={[styles.segment, styles.segmentFill]}
        >
          {option.icon ? (
            <MaterialCommunityIcons
              name={option.icon}
              size={Layout.SEGMENT_ICON}
              color={theme.colors.onSurfaceVariant}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
          <AppText
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {option.label}
          </AppText>
        </Pressable>
      ),
    )}
  </View>
);

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  rule: {
    height: 1,
    marginVertical: Layout.BADGE_MD,
  },
  label: {
    marginBottom: Spacing.xs + 2,
  },
  box: {
    height: Layout.FIELD_HEIGHT - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  segmented: {
    flexDirection: 'row',
    gap: Layout.PROGRESS_BAR_GAP,
    padding: Layout.PROGRESS_BAR_GAP,
    borderRadius: Layout.SECTION_GAP,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  segmentFill: {
    height: Layout.TAB_SEGMENT_HEIGHT - 2,
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
