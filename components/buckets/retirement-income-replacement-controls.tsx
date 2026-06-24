import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { RetirementInputs } from '@/constants/retirement';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatCurrency } from '@/utils/format';
import {
  clampIncomeReplacementPercent,
  DEFAULT_INCOME_REPLACEMENT_PERCENT,
} from '@/utils/retirement-income-target';
import {
  estimateRetirementTargetIncomeTax,
} from '@/utils/retirement-income-tax';
import { normalizeFiniteNumber } from '@/utils/numbers';
import { showMessage } from '@/utils/show-message';

export const RETIREMENT_NEED_EXPLANATION =
  'Your retirement goal estimates the portfolio needed to support your target retirement income.\n\nOther income sources, such as Social Security or pensions, reduce the amount your investments must provide.';

const NET_INCOME_TAX_INFO =
  'Estimated net income uses current federal tax brackets, the standard deduction, and your selected retirement state tax settings.\n\nSocial Security taxes and other retirement-specific tax rules are not included.';

type RetirementIncomeReplacementControlsProps = {
  retirement: RetirementInputs;
  householdGrossAnnual: number;
  onPatch: (patch: Partial<RetirementInputs>) => void;
};

export function RetirementIncomeReplacementControls({
  retirement,
  householdGrossAnnual,
  onPatch,
}: RetirementIncomeReplacementControlsProps) {
  const { colors } = useAppTheme();
  const percent = clampIncomeReplacementPercent(
    retirement.incomeReplacementPercent ?? DEFAULT_INCOME_REPLACEMENT_PERCENT
  );

  const [sliderPercent, setSliderPercent] = useState(percent);
  useEffect(() => {
    setSliderPercent(percent);
  }, [percent]);

  const targetIncome =
    householdGrossAnnual > 0
      ? Math.round((householdGrossAnnual * sliderPercent) / 100)
      : retirement.desiredAnnualGrossIncome;

  const targetTaxEstimate = useMemo(
    () =>
      targetIncome > 0
        ? estimateRetirementTargetIncomeTax(targetIncome, retirement)
        : null,
    [
      targetIncome,
      retirement.retirementStateOfResidence,
      retirement.retirementFilingStatus,
    ]
  );

  const showNetIncomeInfo = () => {
    showMessage('Estimated Net Income', NET_INCOME_TAX_INFO);
  };

  const applyPercent = (nextPercent: number) => {
    const clamped = clampIncomeReplacementPercent(nextPercent);
    setSliderPercent(clamped);
    const desired =
      householdGrossAnnual > 0
        ? Math.round((householdGrossAnnual * clamped) / 100)
        : retirement.desiredAnnualGrossIncome;
    onPatch({
      incomeReplacementPercent: clamped,
      desiredAnnualGrossIncome: desired,
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <ThemedText type="captionMedium">Gross Income</ThemedText>
      </View>
      <View style={styles.sliderRow}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.tint, minWidth: 40 }}>
          {sliderPercent}%
        </ThemedText>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={200}
          step={1}
          value={sliderPercent}
          onValueChange={(v) =>
            applyPercent(Math.round(normalizeFiniteNumber(v, DEFAULT_INCOME_REPLACEMENT_PERCENT)))
          }
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.track}
          thumbTintColor={colors.tint}
        />
        <ThemedText
          type="small"
          style={{ color: colors.textMuted, minWidth: 36, textAlign: 'right' }}>
          200%
        </ThemedText>
      </View>
      {targetIncome > 0 ? (
        <View style={styles.incomeSummary}>
          <ThemedText type="small" style={{ color: colors.textMuted }}>
            Target Gross Income: {formatCurrency(targetIncome)} / yr
          </ThemedText>
          {targetTaxEstimate ? (
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              Estimated Effective Tax Rate: {targetTaxEstimate.effectiveTaxRatePercent}%
            </ThemedText>
          ) : null}
          {targetTaxEstimate ? (
            <View style={styles.summaryLabelRow}>
              <ThemedText type="small" style={{ color: colors.textMuted }}>
                Estimated Net Income: {formatCurrency(targetTaxEstimate.estimatedNetIncome)} / yr
              </ThemedText>
              <Pressable
                onPress={showNetIncomeInfo}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="How estimated net income is calculated">
                <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  incomeSummary: {
    gap: Spacing.xs,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
