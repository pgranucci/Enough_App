import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ExpenseInputs } from '@/constants/profile';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { DEFAULT_SLUSH_COVERAGE_MONTHS } from '@/src/core/buckets/expense-targets';
import { normalizeFiniteNumber } from '@/utils/numbers';

const SLUSH_CALC_EXPLANATION =
  'Your slush fund is money set aside for non-emergencies. It gives you flexibility for unexpected expenses, opportunities, or extra spending without touching your emergency fund.\n\nCalculation:\nTotal Monthly Spending × Months of Coverage\n\nUnlike an emergency fund, a slush fund is meant to be used.';

type SlushFundControlsProps = {
  expenses: ExpenseInputs;
  onPatch: (patch: Partial<ExpenseInputs>) => void;
};

export function SlushFundControls({ expenses, onPatch }: SlushFundControlsProps) {
  const { colors } = useAppTheme();
  const months = Number.isFinite(expenses.slushCoverageMonths)
    ? Math.min(24, Math.max(1, Math.round(expenses.slushCoverageMonths)))
    : DEFAULT_SLUSH_COVERAGE_MONTHS;

  const [sliderMonths, setSliderMonths] = useState(months);
  useEffect(() => {
    setSliderMonths(months);
  }, [months]);

  const showInfo = () => {
    Alert.alert('Slush fund', SLUSH_CALC_EXPLANATION);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <ThemedText type="captionMedium">Months of total spending</ThemedText>
        <Pressable
          onPress={showInfo}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Slush fund guidance">
          <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.sliderRow}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.tint, minWidth: 28 }}>
          {sliderMonths}
        </ThemedText>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={24}
          step={1}
          value={sliderMonths}
          onValueChange={(v) => {
            const m = Math.round(normalizeFiniteNumber(v, DEFAULT_SLUSH_COVERAGE_MONTHS));
            setSliderMonths(m);
            onPatch({ slushCoverageMonths: m });
          }}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.track}
          thumbTintColor={colors.tint}
        />
        <ThemedText
          type="small"
          style={{ color: colors.textMuted, minWidth: 28, textAlign: 'right' }}>
          24
        </ThemedText>
      </View>
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
});
