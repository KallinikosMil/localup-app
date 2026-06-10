import {
  MD3DarkTheme,
  MD3LightTheme,
  useTheme,
} from 'react-native-paper';
import { lightColors, darkColors } from '@theme/colors';

export const PaperLight = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, ...lightColors },
};

export const PaperDark = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, ...darkColors },
};

// Typed access to our custom tokens (modeLocal, like,
// gradientStart, …) on top of MD3. Use this instead of
// the raw useTheme() in components that need them.
export type AppTheme = typeof PaperLight;
export const useAppTheme = () => useTheme<AppTheme>();
