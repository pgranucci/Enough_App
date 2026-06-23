import { StyleSheet, Text, type TextProps } from 'react-native';

import { Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'screenTitle'
    | 'sectionTitle'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'caption'
    | 'captionMedium'
    | 'small'
    | 'eyebrow'
    | 'metric'
    | 'metricSmall'
    | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'screenTitle' ? styles.screenTitle : undefined,
        type === 'sectionTitle' ? styles.sectionTitle : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'captionMedium' ? styles.captionMedium : undefined,
        type === 'small' ? styles.small : undefined,
        type === 'eyebrow' ? styles.eyebrow : undefined,
        type === 'metric' ? styles.metric : undefined,
        type === 'metricSmall' ? styles.metricSmall : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: Typography.body,
  title: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  screenTitle: Typography.screenTitle,
  sectionTitle: Typography.sectionTitle,
  defaultSemiBold: Typography.bodySemiBold,
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  caption: Typography.caption,
  captionMedium: Typography.captionMedium,
  small: Typography.small,
  eyebrow: Typography.eyebrow,
  metric: Typography.metric,
  metricSmall: Typography.metricSmall,
  link: {
    ...Typography.link,
    color: '#1F4D3A',
  },
});
