import React from 'react';
import { Chip } from 'react-native-paper';

type Props = {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
};

const InterestChip = ({
  label,
  icon,
  selected = false,
  onPress,
}: Props) => (
  <Chip
    mode={selected ? 'flat' : 'outlined'}
    selected={selected}
    onPress={onPress}
    icon={icon}
    style={{ margin: 4 }}
    compact
  >
    {label}
  </Chip>
);

export default InterestChip;
