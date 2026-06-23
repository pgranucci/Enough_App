import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBalanceSummaryCard } from '@/components/progress/progress-balance-summary-card';
import { ProgressBucketCard } from '@/components/progress/progress-bucket-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { AppThemeColors } from '@/constants/theme';
import type { EnoughScoreGoalProgressRow } from '@/src/core/enough-score/enough-score-goal-progress';

type EnoughScoreGoalProgressProps = {
  rows: EnoughScoreGoalProgressRow[];
  totalBalance: number;
  colors: AppThemeColors;
};

export function EnoughScoreGoalProgress({
  rows,
  totalBalance,
  colors,
}: EnoughScoreGoalProgressProps) {
  const router = useRouter();

  if (rows.length === 0) return null;

  const openBuckets = () => router.push('/(tabs)/buckets');

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="sectionTitle">Buckets</ThemedText>
        <Pressable
          onPress={openBuckets}
          hitSlop={8}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Add bucket">
          <Ionicons name="add" size={16} color={colors.tint} />
          <ThemedText type="captionMedium" style={{ color: colors.tint }}>
            Add Bucket
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.cardList}>
        {rows.map((row) => (
          <ProgressBucketCard key={row.id} row={row} colors={colors} onPress={openBuckets} />
        ))}
      </View>

      <ProgressBalanceSummaryCard
        totalBalance={totalBalance}
        colors={colors}
        onPress={openBuckets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonPressed: {
    opacity: 0.75,
  },
  cardList: {
    gap: Spacing.md,
  },
});
