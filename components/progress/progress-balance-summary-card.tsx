import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { AppThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';

type ProgressBalanceSummaryCardProps = {
  totalBalance: number;
  colors: AppThemeColors;
  onPress?: () => void;
};

export function ProgressBalanceSummaryCard({
  totalBalance,
  colors,
  onPress,
}: ProgressBalanceSummaryCardProps) {
  const accent = colors.tint;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
        colors.shadow,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Current balance ${formatCurrency(totalBalance)}`}>
      <View style={[styles.iconBadge, { backgroundColor: `${accent}22` }]}>
        <Ionicons name="wallet-outline" size={22} color={accent} />
      </View>

      <View style={styles.content}>
        <ThemedText type="small" style={{ color: colors.textMuted }}>
          Current balance
        </ThemedText>
        <ThemedText type="sectionTitle">{formatCurrency(totalBalance)}</ThemedText>
      </View>

      <View style={[styles.arrowButton, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>

      <View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: `${accent}18` }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    overflow: 'hidden',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    bottom: -28,
    right: -12,
    width: 160,
    height: 80,
    borderRadius: Radius.full,
  },
});
