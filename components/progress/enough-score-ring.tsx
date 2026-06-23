import { StyleSheet, View } from 'react-native';

import { CircularProgressRing } from '@/components/progress/circular-progress-ring';
import { ThemedText } from '@/components/themed-text';
import type { AppThemeColors } from '@/constants/theme';

const RING_SIZE = 248;
const RING_STROKE = 10;
const RING_GRADIENT = ['#FFFFFF', '#7EB89A'] as const;

type EnoughScoreRingProps = {
  score: number;
  colors: AppThemeColors;
};

export function EnoughScoreRing({ score, colors }: EnoughScoreRingProps) {
  const clampedScore = Math.min(Math.max(score, 0), 100);
  const progress = clampedScore / 100;

  return (
    <View style={styles.wrapper}>
      <CircularProgressRing
        progress={progress}
        color={colors.tint}
        gradientColors={RING_GRADIENT}
        trackColor={colors.track}
        size={RING_SIZE}
        strokeWidth={RING_STROKE}>
        <View style={styles.centerContent}>
          <ThemedText type="metric" style={[styles.score, { color: colors.text }]}>
            {clampedScore}
          </ThemedText>
          <ThemedText style={[styles.title, { color: colors.textMuted }]}>Enough Score</ThemedText>
        </View>
      </CircularProgressRing>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 96,
  },
  score: {
    fontSize: 56,
    lineHeight: 60,
  },
  title: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.4,
    lineHeight: 18,
    textAlign: 'center',
  },
});
