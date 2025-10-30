import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Modal, Portal, useTheme } from 'react-native-paper';
import { Spacing } from '@theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

const CustomModal = ({
  visible,
  onDismiss,
  children,
  contentStyle,
}: Props) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.contentStyle,
          { backgroundColor: theme.colors.surface },
          contentStyle,
        ]}
      >
        {children}
      </Modal>
    </Portal>
  );
};

export default CustomModal;

const styles = StyleSheet.create({
  contentStyle: {
    margin: Spacing.SPACING_PADDING_24,
    padding: Spacing.SPACING_PADDING_24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius:16
  },
  
});
