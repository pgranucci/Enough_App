import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatCurrency } from '@/utils/format';

type EffectivePortfolioValueProps = {
  totalEffective: number;
  traditionalBalance: number;
  rothBalance: number;
  rothGrossEquivalent: number;
  nominalTotal?: number;
  /** Effective tax rate estimated from retirement gross income, state, and filing status. */
  effectiveTaxRatePercent?: number;
  rothBalanceShare?: number;
  accentColor: string;
  nested?: boolean;
  compact?: boolean;
  flush?: boolean;
};

export function EffectivePortfolioValue({
  totalEffective,
  traditionalBalance,
  rothBalance,
  rothGrossEquivalent,
  nominalTotal,
  effectiveTaxRatePercent,
  rothBalanceShare,
  accentColor,
  nested = false,
  compact = false,
  flush = false,
}: EffectivePortfolioValueProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        nested && { backgroundColor: colors.surfaceMuted, borderRadius: Radius.md },
        compact && styles.compact,
        flush && styles.flush,
      ]}>
      <ThemedText type="eyebrow" style={{ color: colors.textMuted }}>
        Total effective retirement portfolio
      </ThemedText>
      <ThemedText type="metricSmall" style={{ color: accentColor }}>
        {formatCurrency(totalEffective)}
      </ThemedText>
      <ThemedText type="small" style={{ color: colors.textMuted }}>
        Traditional {formatCurrency(traditionalBalance)} + Roth {formatCurrency(rothBalance)} →{' '}
        {formatCurrency(rothGrossEquivalent)} gross equivalent
        {effectiveTaxRatePercent != null
          ? rothBalanceShare != null && rothBalanceShare > 0
            ? ` (${effectiveTaxRatePercent.toFixed(1)}% effective tax; ${Math.round(rothBalanceShare * 100)}% Roth)`
            : ` (${effectiveTaxRatePercent.toFixed(1)}% effective tax)`
          : null}
      </ThemedText>
      {nominalTotal != null && nominalTotal !== totalEffective && (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Account balances total {formatCurrency(nominalTotal)} before Roth adjustment
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  compact: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  flush: {
    padding: 0,
  },
});
