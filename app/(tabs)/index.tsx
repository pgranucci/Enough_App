import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnoughScoreGoalProgress } from '@/components/progress/enough-score-goal-progress';
import { EnoughScoreRing } from '@/components/progress/enough-score-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { buildEnoughScoreGoalProgressRows } from '@/src/core/enough-score/enough-score-goal-progress';

export default function EnoughScoreScreen() {
  const { colors } = useAppTheme();
  const { loading, enoughScore, enoughScoreResult, excessSummary } = useAppData();

  const goalProgressRows = useMemo(
    () => buildEnoughScoreGoalProgressRows(excessSummary.lines, enoughScoreResult),
    [excessSummary.lines, enoughScoreResult]
  );

  const totalBalance = useMemo(
    () => excessSummary.lines.reduce((sum, line) => sum + line.current, 0),
    [excessSummary.lines]
  );

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
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="screenTitle">Progress</ThemedText>
          </View>

          <View style={styles.scoreArea}>
            <EnoughScoreRing score={enoughScore} colors={colors} />
          </View>

          <EnoughScoreGoalProgress
            rows={goalProgressRows}
            totalBalance={totalBalance}
            colors={colors}
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
  },
  header: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scoreArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
