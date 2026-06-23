import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/progress/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { ProgressSummary } from '@/utils/progress-score';

type BucketCardProps = {
  bucket: ProgressSummary;
  amountLabel?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function BucketCard({ bucket, amountLabel }: BucketCardProps) {
  const { colors } = useAppTheme();
  const progress = bucket.target > 0 ? bucket.current / bucket.target : 0;
  const percent = Math.round(progress * 100);

  return (
    <Card style={styles.card} padding="sm">
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: bucket.accent }]} />
        <ThemedText type="captionMedium" style={styles.name}>
          {bucket.name}
        </ThemedText>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.barWrap}>
          <ProgressBar
            progress={progress}
            color={bucket.accent}
            trackColor={colors.track}
            height={8}
          />
        </View>
        <ThemedText type="captionMedium" style={[styles.percent, { color: colors.textMuted }]}>
          {percent}%
        </ThemedText>
      </View>
      <ThemedText type="small" style={[styles.amounts, { color: colors.textMuted }]}>
        {amountLabel ? `${amountLabel} ` : ''}
        {formatCurrency(bucket.current)} of {formatCurrency(bucket.target)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  name: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barWrap: {
    flex: 1,
    minWidth: 0,
  },
  percent: {
    minWidth: 38,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  amounts: {
    textAlign: 'left',
  },
});
