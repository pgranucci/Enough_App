import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = ViewProps & {
  padding?: CardPadding;
  elevated?: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
};

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: Spacing.md,
  md: Spacing.lg,
  lg: Spacing.xl,
};

export function Card({
  children,
  padding = 'md',
  elevated = true,
  muted = false,
  style,
  ...rest
}: CardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: muted ? colors.surfaceMuted : colors.surface,
          padding: paddingMap[padding],
          borderRadius: Radius.lg,
        },
        elevated && colors.shadow,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
