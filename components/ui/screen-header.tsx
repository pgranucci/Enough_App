import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
};

export function ScreenHeader({ title, subtitle, style }: ScreenHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.header, style]}>
      <ThemedText type="screenTitle">{title}</ThemedText>
      {subtitle ? (
        <ThemedText type="caption" style={{ color: colors.textMuted }}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
});
