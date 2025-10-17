import React from 'react';
import { View } from 'react-native';
import { Spacing } from '@theme/constants/Spacing';

type Props = {
  spacing: number;
  horizontal?: boolean;
};

const Spacer = ({ horizontal, spacing = Spacing.SPACING_PADDING_8}: Props) => {
  return (
    <View style={horizontal ? { width: spacing } : { height: spacing }}></View>
  );
};

export default Spacer;
