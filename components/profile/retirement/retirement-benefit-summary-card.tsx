import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type RetirementBenefitSummaryCardProps = {
  label?: string;
  amountLabel: string;
};

export function RetirementBenefitSummaryCard({
  label = 'Estimated Monthly Social Security Benefit',
  amountLabel,
}: RetirementBenefitSummaryCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}>
      <View style={[styles.iconBadge, { backgroundColor: `${colors.tint}22` }]}>
        <Ionicons name="trending-up-outline" size={20} color={colors.tint} />
      </View>
      <View style={styles.textBlock}>
        <ThemedText
          type="small"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[styles.label, { color: colors.textMuted }]}>
          {label}
        </ThemedText>
        <ThemedText type="sectionTitle" style={{ color: colors.tint }}>
          {amountLabel}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: Spacing.xs,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
});
