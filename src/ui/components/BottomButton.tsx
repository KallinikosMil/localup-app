import React from 'react';
import {
  View,
  StyleSheet,
  type DimensionValue,
} from 'react-native';
import { Button } from 'react-native-paper';

type BottomButtonProps = {
  label: string;
  onPress: () => void;
  width?: DimensionValue;
};

const BottomButton = ({
  label,
  onPress,
  width = '100%',
}: BottomButtonProps) => (
  <View style={[styles.container, { width }]}>
    <Button mode="contained" onPress={onPress}>
      {label}
    </Button>
  </View>
);

export default BottomButton;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
