import { View, type ViewProps } from 'react-native';

import { AppPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const defaultCanvas = AppPalette[colorScheme === 'dark' ? 'dark' : 'light'].canvas;
  const backgroundColor = useThemeColor(
    { light: lightColor ?? defaultCanvas, dark: darkColor ?? defaultCanvas },
    'background'
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
