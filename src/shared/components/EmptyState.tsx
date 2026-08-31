import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppIcon, { type IconName } from '@shared/components/AppIcon';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import Spacer from '@shared/components/Spacer';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
};

const EmptyState = ({ icon, title, subtitle, action }: EmptyStateProps) => {
  const theme = useAppTheme();

  return (
    <View style={styles.root}>
      <AppIcon name={icon} size={48} color={theme.colors.onSurfaceVariant} />
      <Spacer spacing={Spacing.lg} />
      <AppText
        variant="h3"
        style={{
          color: theme.colors.onBackground,
        }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <>
          <Spacer spacing={Spacing.sm} />
          <AppText
            variant="body"
            style={[
              styles.subtitle,
              {
                color: theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {subtitle}
          </AppText>
        </>
      ) : null}
      {action ? (
        <>
          <Spacer spacing={Spacing.xl} />
          <AppButton variant="outlined" onPress={action.onPress}>
            {action.label}
          </AppButton>
        </>
      ) : null}
    </View>
  );
};

export default EmptyState;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  subtitle: {
    textAlign: 'center',
  },
});
