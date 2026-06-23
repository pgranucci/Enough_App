import { useMemo } from 'react';

import {
  AppPalette,
  Colors,
  getCardShadow,
  Radius,
  Spacing,
  type AppThemeColors,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AppTheme = {
  isDark: boolean;
  colors: AppThemeColors;
  spacing: typeof Spacing;
  radius: typeof Radius;
};

export function useAppTheme(): AppTheme {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const palette = AppPalette[isDark ? 'dark' : 'light'];

  return useMemo(
    () => ({
      isDark,
      colors: {
        ...palette,
        tint: Colors[colorScheme].tint,
        shadow: getCardShadow(isDark),
      },
      spacing: Spacing,
      radius: Radius,
    }),
    [colorScheme, isDark]
  );
}
