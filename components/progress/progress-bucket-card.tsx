import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { BucketIcon } from '@/components/buckets/bucket-icon';
import { ProgressBar } from '@/components/progress/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { AppThemeColors } from '@/constants/theme';
import type { EnoughScoreGoalProgressRow } from '@/src/core/enough-score/enough-score-goal-progress';

type ProgressBucketCardProps = {
  row: EnoughScoreGoalProgressRow;
  colors: AppThemeColors;
  onPress?: () => void;
};

export function ProgressBucketCard({ row, colors, onPress }: ProgressBucketCardProps) {
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
      accessibilityLabel={`${row.name}, ${row.percentLabel}`}>
      <View style={[styles.iconBadge, { backgroundColor: `${row.accent}22` }]}>
        <BucketIcon bucketId={row.id} color={row.accent} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.name}>
            {row.name}
          </ThemedText>
          <ThemedText type="captionMedium" style={[styles.percentLabel, { color: colors.textMuted }]}>
            {row.percentLabel}
          </ThemedText>
        </View>

        <ProgressBar
          progress={row.completion}
          color={colors.textMuted}
          trackColor={colors.track}
          height={6}
        />

        <View style={styles.amountRow}>
          {row.amountPrefix ? (
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              {`${row.amountPrefix}${row.amountPrimary}`}
            </ThemedText>
          ) : (
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              {`${row.amountPrimary}${row.amountSecondary ?? ''}`}
            </ThemedText>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.sm,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
  },
  percentLabel: {
    flexShrink: 0,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
