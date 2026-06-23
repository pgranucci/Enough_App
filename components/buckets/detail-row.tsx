import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type DetailRowProps = {
  label: string;
  value: string;
  mutedText: string;
  highlight?: boolean;
  infoMessage?: string;
};

export function DetailRow({ label, value, mutedText, highlight, infoMessage }: DetailRowProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.labelWrap}>
        <ThemedText type="caption" style={[styles.label, { color: mutedText }]}>
          {label}
        </ThemedText>
        {infoMessage ? (
          <Pressable
            onPress={() => Alert.alert(label, infoMessage)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`About ${label}`}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
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
    alignItems: 'center',
    gap: Spacing.md,
  },
  labelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    flexShrink: 1,
  },
  value: {
    textAlign: 'right',
  },
});
