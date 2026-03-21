import React from 'react';
import { Text } from 'react-native-paper';
import {
  Typography,
  type TypographyVariant,
} from '@theme/typography';

type AppTextProps = Omit<
  React.ComponentProps<typeof Text>,
  'variant'
> & {
  variant: TypographyVariant;
};

const AppText = ({
  variant,
  style,
  ...rest
}: AppTextProps) => {
  const { paperVariant, style: typographyStyle } =
    Typography[variant];

  return (
    <Text
      variant={paperVariant}
      style={[typographyStyle, style]}
      {...rest}
    />
  );
};

export default AppText;
