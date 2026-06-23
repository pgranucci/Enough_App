import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MyExcessSection } from '@/components/freedom/my-excess-section';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
import type { BucketItem } from '@/constants/buckets';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { calculateRetirementPaceMetrics } from '@/src/core/retirement/retirement-projection-utils';
import type { ExcessSummary } from '@/utils/bucket-excess';
import {
  retirementBucketReadinessMeetsTarget,
  retirementBucketReadinessPercent,
} from '@/utils/retirement-bucket-readiness';

export default function FreedomScreen() {
  const { colors } = useAppTheme();
  const {
    loading,
    profile,
    retirement,
    bucketEntries,
    excessSummary,
    excessIncluded,
    setExcessIncluded,
  } = useAppData();

  const retirementBucket = useMemo(
    () =>
      bucketEntries.find(
        (entry): entry is BucketItem => !('children' in entry) && entry.id === 'retirement'
      ) ?? null,
    [bucketEntries]
  );

  const retirementPace = useMemo(() => {
    if (!retirementBucket) return null;
    return calculateRetirementPaceMetrics({
      retirementBucket,
      profile,
      retirement,
    });
  }, [retirementBucket, profile, retirement]);

  const projectedRetirementReadinessPercent = useMemo(
    () => retirementBucketReadinessPercent(retirementBucket),
    [retirementBucket]
  );

  const excessSummaryWithRetirementPace = useMemo<ExcessSummary>(() => {
    const retirementProgressExceeds100 = retirementBucketReadinessMeetsTarget(retirementBucket);

    const lines = excessSummary.lines.map((line) =>
      line.id === 'retirement' && retirementPace
        ? {
            ...line,
            current: retirementPace.currentRetirementBalance,
            /** Retirement stays visible for pace, but never adds to total excess. */
            excess: 0,
          }
        : line
    );
    const includedForTotal = lines.filter((line) => excessIncluded[line.id] !== false);
    const retirementLine = lines.find((line) => line.id === 'retirement');
    const retirementIncluded = excessIncluded.retirement !== false;
    const nonRetirementWithExcess = includedForTotal.filter(
      (line) => line.id !== 'retirement' && line.excess > 0
    );
    const includedLines = [
      ...nonRetirementWithExcess,
      ...(retirementProgressExceeds100 && retirementLine && retirementIncluded
        ? [retirementLine]
        : []),
    ];
    return {
      lines,
      includedLines,
      totalExcess: Math.round(includedForTotal.reduce((sum, line) => sum + line.excess, 0)),
    };
  }, [
    excessSummary.lines,
    excessIncluded,
    retirementPace,
    retirementBucket,
  ]);

  if (loading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <ScreenHeader title="My Excess" />

          <MyExcessSection
            summary={excessSummaryWithRetirementPace}
            includedIds={excessIncluded}
            onToggle={setExcessIncluded}
            retirementPace={retirementPace}
            projectedRetirementReadinessPercent={projectedRetirementReadinessPercent}
            projectedRetirementBalance={retirementBucket?.projectedGrossEquivalent}
            estimatedRetirementNeed={retirementBucket?.target}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
});
