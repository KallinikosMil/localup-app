import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { lightColors, darkColors } from '@theme/colors';

export const PaperLight = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, ...lightColors },
};

export const PaperDark = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, ...darkColors },
};
