/**
 * Calm, premium palette inspired by Monarch Money — warm canvas, white cards,
 * forest accent, soft shadows, and generous spacing.
 */

import { Platform, type ViewStyle } from 'react-native';

const tintColorLight = '#1F4D3A';
const tintColorDark = '#7EB89A';

export const Colors = {
  light: {
    text: '#1C2127',
    background: '#F5F3EF',
    tint: tintColorLight,
    icon: '#6F7782',
    tabIconDefault: '#9AA3AD',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F2F4F6',
    background: '#0E1012',
    tint: tintColorDark,
    icon: '#9AA3AD',
    tabIconDefault: '#6F7782',
    tabIconSelected: tintColorDark,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
} as const;

export const Typography = {
  screenTitle: {
    fontSize: 30,
    fontWeight: '600' as const,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySemiBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
  metric: {
    fontSize: 44,
    fontWeight: '600' as const,
    letterSpacing: -1,
    lineHeight: 48,
  },
  metricSmall: {
    fontSize: 32,
    fontWeight: '600' as const,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  link: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
};

export type AppThemeColors = {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  track: string;
  border: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  tint: string;
  inputBackground: string;
  shadow: ViewStyle;
  tabBar: string;
  tabBarBorder: string;
};

export const AppPalette = {
  light: {
    canvas: '#F5F3EF',
    surface: '#FFFFFF',
    surfaceMuted: '#FAF9F7',
    track: '#E8E4DD',
    border: '#E5E1DA',
    text: '#1C2127',
    textMuted: '#6F7782',
    textSecondary: '#9AA3AD',
    tint: tintColorLight,
    inputBackground: '#FAF9F7',
    tabBar: '#FFFFFF',
    tabBarBorder: '#EBE7E0',
  },
  dark: {
    canvas: '#0E1012',
    surface: '#1A1D21',
    surfaceMuted: '#22262B',
    track: '#2E3339',
    border: '#2E3339',
    text: '#F2F4F6',
    textMuted: '#9AA3AD',
    textSecondary: '#6F7782',
    tint: tintColorDark,
    inputBackground: '#15181C',
    tabBar: '#1A1D21',
    tabBarBorder: '#2E3339',
  },
} as const;

export function getCardShadow(isDark: boolean): ViewStyle {
  if (isDark) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 4,
    };
  }
  return {
    shadowColor: '#1C2127',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  };
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
