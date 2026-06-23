import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ExpenseInputs } from '@/constants/profile';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { DEFAULT_EMERGENCY_COVERAGE_MONTHS } from '@/src/core/buckets/expense-targets';
import { normalizeFiniteNumber } from '@/utils/numbers';

const EMERGENCY_CALC_EXPLANATION =
  'Your emergency fund is the amount of cash you want set aside for unexpected events. We calculate it by multiplying your monthly essential expenses by the number of months of coverage you choose.\n\nEssential expenses typically include:\n\nHousing\nGroceries\nUtilities\nInsurance\nTransportation\nMinimum debt payments\n\nMost people keep 3–6 months of essential expenses in an emergency fund, but you can choose a higher or lower amount based on your situation.';

type EmergencyCoverageControlsProps = {
  expenses: ExpenseInputs;
  onPatch: (patch: Partial<ExpenseInputs>) => void;
};

export function EmergencyCoverageControls({ expenses, onPatch }: EmergencyCoverageControlsProps) {
  const { colors } = useAppTheme();
  const months = Number.isFinite(expenses.emergencyCoverageMonths)
    ? Math.min(24, Math.max(1, Math.round(expenses.emergencyCoverageMonths)))
    : DEFAULT_EMERGENCY_COVERAGE_MONTHS;

  /** Local value avoids controlled-Slider fighting parent updates on some platforms. */
  const [sliderMonths, setSliderMonths] = useState(months);
  useEffect(() => {
    setSliderMonths(months);
  }, [months]);

  const showInfo = () => {
    Alert.alert('Emergency fund', EMERGENCY_CALC_EXPLANATION);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <ThemedText type="captionMedium">Months of coverage</ThemedText>
        <Pressable
          onPress={showInfo}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Emergency fund guidance">
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
            const m = Math.round(normalizeFiniteNumber(v, DEFAULT_EMERGENCY_COVERAGE_MONTHS));
            setSliderMonths(m);
            onPatch({ emergencyCoverageMonths: m });
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
