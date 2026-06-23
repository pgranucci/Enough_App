import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type RetirementResultRowProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

export function RetirementResultRow({ label, value, highlight }: RetirementResultRowProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <ThemedText type="caption" style={[styles.label, { color: colors.textMuted }]}>
        {label}
      </ThemedText>
      <ThemedText type={highlight ? 'captionMedium' : 'caption'} style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  label: {
    flex: 1,
  },
  value: {
    textAlign: 'right',
    maxWidth: '50%',
  },
});
