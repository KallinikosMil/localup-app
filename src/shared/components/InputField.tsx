import React from 'react';
import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  useFormContext,
  useController,
  type FieldValues,
  type FieldPath,
  type RegisterOptions,
} from 'react-hook-form';

import AppText from '@shared/components/AppText';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Typography } from '@theme/typography';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

// The redesign moves the label ABOVE the field instead of floating it
// inside, so this is a plain RN TextInput in a styled box rather than
// Paper's outlined input. The react-hook-form contract is unchanged —
// every existing call site passes only name/label/rules and standard
// TextInput props — so all nine of them get the new look for free.
//
// The border carries the state: hairline at rest, the selected violet
// while focused, the error tone when invalid. That ordering matters —
// an invalid field that is also focused should say invalid.

type RNInputProps = React.ComponentProps<typeof TextInput>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type InputFieldProps<T extends FieldValues> = {
  name: FieldPath<T>;
  label?: string;
  rules?: RegisterOptions<T, FieldPath<T>>;
  validateOnBlur?: boolean;
  // Leading glyph. Optional: an icon that means nothing is worse than no
  // icon.
  icon?: IconName;
  // A line under the field explaining what it is for. Replaced by the
  // validation message while the field is invalid — two lines of small
  // grey text, one of them an error, is how an error goes unread.
  helper?: string;
} & Omit<RNInputProps, 'value' | 'onChangeText' | 'onBlur' | 'style'>;

const InputField = <T extends FieldValues>({
  name,
  label,
  rules,
  validateOnBlur = true,
  icon,
  helper,
  secureTextEntry,
  ...rest
}: InputFieldProps<T>) => {
  const { control, trigger } = useFormContext<T>();
  const { t } = useTranslation();
  const theme = useAppTheme();

  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({ name, control, rules });

  const [isVisible, setIsVisible] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  const handleBlur = React.useCallback(() => {
    setFocused(false);
    onBlur();
    if (validateOnBlur) void trigger(name);
  }, [onBlur, validateOnBlur, trigger, name]);

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.outlineSelected
      : theme.colors.outlineVariant;

  return (
    <View>
      {label ? (
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
      ) : null}

      <View
        style={[
          styles.box,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor,
          },
        ]}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={Layout.FIELD_ICON}
            color={theme.colors.onSurfaceFaint}
          />
        ) : null}

        <TextInput
          ref={ref}
          value={value ?? ''}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry && !isVisible}
          placeholderTextColor={theme.colors.onSurfaceFaint}
          // The box owns the height and the padding; the input just fills
          // it. Without this the text sits against the top on Android.
          style={[
            styles.input,
            Typography.message.style,
            {
              color: theme.colors.onSurface,
            },
          ]}
          {...rest}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsVisible(v => !v)}
            // The glyph flips between an eye and a crossed-out eye; both
            // are announced as "button" without this, so the control that
            // reveals a password is indistinguishable from any other icon.
            accessibilityRole="button"
            accessibilityLabel={t(
              isVisible ? Common.A11Y_HIDE_PASSWORD : Common.A11Y_SHOW_PASSWORD,
            )}
            accessibilityState={{ selected: isVisible }}
            hitSlop={12}
          >
            <MaterialCommunityIcons
              name={isVisible ? 'eye-off-outline' : 'eye-outline'}
              size={Layout.FIELD_ICON}
              color={theme.colors.onSurfaceFaint}
            />
          </Pressable>
        ) : null}
      </View>

      {error?.message || helper ? (
        <AppText
          variant="caption"
          style={[
            styles.helper,
            {
              color: error?.message
                ? theme.colors.error
                : theme.colors.onSurfaceFaint,
            },
          ]}
        >
          {error?.message ?? helper}
        </AppText>
      ) : null}
    </View>
  );
};

export default InputField;

const styles = StyleSheet.create({
  label: {
    marginBottom: Layout.FIELD_LABEL_GAP,
  },
  box: {
    minHeight: Layout.FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.FIELD_INNER_GAP,
    paddingHorizontal: Layout.FIELD_PADDING_H,
    borderRadius: Layout.FIELD_RADIUS,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    // Android centres poorly with a fixed height on a bare TextInput;
    // padding plus the box's minHeight does it reliably in both themes.
    paddingVertical: Spacing.md,
  },
  helper: {
    marginTop: Layout.FIELD_LABEL_GAP,
  },
});
