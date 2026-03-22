import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { BorderRadius } from
  '@theme/constants/BorderRadius';

type AppButtonVariant =
  | 'primary'
  | 'outlined'
  | 'link'
  | 'google';

type AppButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'mode'
> & {
  variant: AppButtonVariant;
};

const AppButton = ({
  variant,
  style,
  contentStyle,
  labelStyle,
  ...rest
}: AppButtonProps) => {
  const theme = useTheme();

  const config = getVariantConfig(
    variant,
    theme,
  );

  return (
    <Button
      mode={config.mode}
      buttonColor={config.buttonColor}
      textColor={config.textColor}
      contentStyle={[
        styles.content,
        contentStyle,
      ]}
      labelStyle={[
        config.labelStyle,
        labelStyle,
      ]}
      style={[
        styles.pill,
        config.style,
        style,
      ]}
      {...rest}
    />
  );
};

const getVariantConfig = (
  variant: AppButtonVariant,
  theme: ReturnType<typeof useTheme>,
) => {
  switch (variant) {
    case 'primary':
      return {
        mode: 'contained' as const,
        buttonColor: theme.colors.primary,
        textColor: theme.colors.onPrimary,
        labelStyle: styles.primaryLabel,
        style: undefined,
      };
    case 'outlined':
      return {
        mode: 'outlined' as const,
        buttonColor: undefined,
        textColor: theme.colors.primary,
        labelStyle: undefined,
        style: {
          borderColor: theme.colors.outline,
        },
      };
    case 'link':
      return {
        mode: 'text' as const,
        buttonColor: undefined,
        textColor: theme.colors.primary,
        labelStyle: undefined,
        style: undefined,
      };
    case 'google':
      return {
        mode: 'contained' as const,
        buttonColor: theme.colors.surface,
        textColor: theme.colors.onSurface,
        labelStyle: undefined,
        style: {
          borderWidth: 1,
          borderColor:
            theme.colors.outlineVariant,
          elevation: 0,
        },
      };
  }
};

export default AppButton;

const styles = StyleSheet.create({
  pill: {
    borderRadius: BorderRadius.pill,
  },
  content: {
    height: 52,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
