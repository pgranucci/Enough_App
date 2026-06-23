import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

import { CircularProgressRing } from '@/components/progress/circular-progress-ring';
import { ThemedText } from '@/components/themed-text';
import { circularProgressRingStrokeColor } from '@/constants/enough-score';
import { useAppData } from '@/context/app-data-context';
import { useAppTheme } from '@/hooks/use-app-theme';

type EnoughScoreTabButtonProps = {
  active: boolean;
  onPress: () => void;
};

const RING_SIZE = 32;
const RING_STROKE = 3;

export function EnoughScoreTabButton({ active, onPress }: EnoughScoreTabButtonProps) {
  const { colors } = useAppTheme();
  const { enoughScore } = useAppData();
  const clampedScore = Math.min(Math.max(enoughScore, 0), 100);
  const ringColor = circularProgressRingStrokeColor(clampedScore / 100);

  return (
    <Pressable
      onPress={() => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Progress, Enough Score ${clampedScore}`}
      accessibilityState={{ selected: active }}>
      <CircularProgressRing
        progress={clampedScore / 100}
        color={ringColor}
        trackColor={colors.track}
        size={RING_SIZE}
        strokeWidth={RING_STROKE}>
        <ThemedText style={[styles.score, { color: colors.text }]}>{clampedScore}</ThemedText>
      </CircularProgressRing>
      <ThemedText type="small" style={[styles.label, { color: colors.text }]}>
        Progress
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  score: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
