import Slider from '@react-native-community/slider';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  INVESTMENT_MIX_OPTIONS,
  investmentMixFromIndex,
  investmentMixIndex,
  type InvestmentMix,
} from '@/constants/financial-accounts';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { normalizeFiniteNumber } from '@/utils/numbers';

type InvestmentMixSliderProps = {
  value: InvestmentMix | null;
  onChange: (value: InvestmentMix) => void;
};

export function InvestmentMixSlider({ value, onChange }: InvestmentMixSliderProps) {
  const { colors } = useAppTheme();
  const index = investmentMixIndex(value);
  const [sliderIndex, setSliderIndex] = useState(index);

  useEffect(() => {
    setSliderIndex(investmentMixIndex(value));
  }, [value]);

  const selectedLabel =
    INVESTMENT_MIX_OPTIONS[sliderIndex]?.label ?? INVESTMENT_MIX_OPTIONS[2]!.label;
  const maxIndex = INVESTMENT_MIX_OPTIONS.length - 1;

  return (
    <View style={styles.wrap}>
      <ThemedText type="defaultSemiBold" style={{ color: colors.tint, textAlign: 'center' }}>
        {selectedLabel}
      </ThemedText>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={maxIndex}
        step={1}
        value={sliderIndex}
        onValueChange={(v) => {
          const nextIndex = Math.round(normalizeFiniteNumber(v, index));
          setSliderIndex(nextIndex);
          onChange(investmentMixFromIndex(nextIndex));
        }}
        minimumTrackTintColor={colors.tint}
        maximumTrackTintColor={colors.track}
        thumbTintColor={colors.tint}
        accessibilityLabel="Investment Mix"
        accessibilityValue={{ text: selectedLabel }}
      />
      <View style={styles.labelsRow}>
        {INVESTMENT_MIX_OPTIONS.map((option, optionIndex) => {
          const selected = optionIndex === sliderIndex;
          return (
            <ThemedText
              key={option.id}
              type="small"
              numberOfLines={1}
              style={[
                styles.mixLabel,
                {
                  color: selected ? colors.tint : colors.textMuted,
                  fontWeight: selected ? '600' : '400',
                },
              ]}>
              {option.label}
            </ThemedText>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  mixLabel: {
    flex: 1,
    textAlign: 'center',
  },
});
