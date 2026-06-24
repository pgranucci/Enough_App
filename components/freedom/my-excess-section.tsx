import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Pressable, Switch, StyleSheet, View } from 'react-native';

import { BucketIcon } from '@/components/buckets/bucket-icon';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { RetirementPaceMetrics } from '@/src/core/retirement/retirement-projection-utils';
import type { ExcessBucketLine, ExcessSummary } from '@/utils/bucket-excess';
import { formatCurrency } from '@/utils/format';
import { showMessage } from '@/utils/show-message';

const MY_EXCESS_INFO =
  'My Excess is the total amount saved above your target amounts across all included buckets.\n\nOnly positive excess amounts are counted. Buckets that are below their target do not reduce your excess total.';

const SWITCH_SCALE = 0.78;

type MyExcessSectionProps = {
  summary: ExcessSummary;
  includedIds: Record<string, boolean>;
  onToggle: (id: string, included: boolean) => void;
  retirementPace?: RetirementPaceMetrics | null;
  projectedRetirementReadinessPercent?: number;
  projectedRetirementBalance?: number;
  estimatedRetirementNeed?: number;
};

function retirementUiStatus(
  projectedRetirementReadinessPercent?: number,
  fallbackPaceStatus?: RetirementPaceMetrics['paceStatus']
): 'Ahead' | 'Behind' {
  if (projectedRetirementReadinessPercent != null) {
    return projectedRetirementReadinessPercent >= 100 ? 'Ahead' : 'Behind';
  }
  return fallbackPaceStatus === 'Ahead' ? 'Ahead' : 'Behind';
}

function CompactSwitch(props: ComponentProps<typeof Switch>) {
  return (
    <View style={styles.switchScale}>
      <Switch {...props} />
    </View>
  );
}

function BucketIconBadge({ line }: { line: ExcessBucketLine }) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: `${line.accent}22` }]}>
      <BucketIcon
        bucketId={line.id}
        color={line.accent}
        size={18}
        sourceTemplateId={line.sourceTemplateId}
        bucketName={line.name}
      />
    </View>
  );
}

function IncludeToggle({
  included,
  onToggle,
}: {
  included: boolean;
  onToggle: (included: boolean) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.includeToggle}>
      <ThemedText type="small" style={[styles.includeLabel, { color: colors.textMuted }]}>
        Include in total
      </ThemedText>
      <CompactSwitch
        value={included}
        onValueChange={onToggle}
        trackColor={{ false: colors.track, true: colors.tint }}
        thumbColor="#fff"
      />
    </View>
  );
}

function ExcessSummaryRow({
  line,
  retirementStatus,
}: {
  line: ExcessBucketLine;
  retirementStatus: 'Ahead' | 'Behind';
}) {
  const { colors } = useAppTheme();
  const isRetirement = line.id === 'retirement';

  return (
    <View style={styles.summaryBucketRow}>
      <BucketIconBadge line={line} />
      <ThemedText type="captionMedium" style={styles.summaryBucketName}>
        {line.name}
      </ThemedText>
      {isRetirement ? (
        <ThemedText type="captionMedium" style={{ color: colors.textMuted }}>
          {retirementStatus}
        </ThemedText>
      ) : (
        <ThemedText type="captionMedium" style={{ color: colors.textMuted }}>
          {formatCurrency(line.excess)}
        </ThemedText>
      )}
    </View>
  );
}

function CompactBucketRow({
  line,
  included,
  onToggle,
}: {
  line: ExcessBucketLine;
  included: boolean;
  onToggle: (included: boolean) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.bucketCard, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.bucketHeader}>
        <BucketIconBadge line={line} />
        <View style={styles.bucketText}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {line.name}
          </ThemedText>
          <ThemedText type="small" numberOfLines={1} style={{ color: colors.textMuted }}>
            {`${formatCurrency(line.current)} of ${formatCurrency(line.target)}`}
            {line.groupLabel ? ` · ${line.groupLabel}` : ''}
          </ThemedText>
        </View>
        <IncludeToggle included={included} onToggle={onToggle} />
      </View>
    </View>
  );
}

function RetirementBucketRow({
  line,
  included,
  onToggle,
  retirementPace,
  projectedRetirementReadinessPercent,
  projectedRetirementBalance,
  estimatedRetirementNeed,
  retirementStatus,
}: {
  line: ExcessBucketLine;
  included: boolean;
  onToggle: (included: boolean) => void;
  retirementPace?: RetirementPaceMetrics | null;
  projectedRetirementReadinessPercent?: number;
  projectedRetirementBalance?: number;
  estimatedRetirementNeed?: number;
  retirementStatus: 'Ahead' | 'Behind';
}) {
  const { colors } = useAppTheme();
  const [paceExpanded, setPaceExpanded] = useState(false);
  const currentBalance = retirementPace?.currentRetirementBalance ?? line.current;

  return (
    <View style={[styles.bucketCard, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.retirementTop}>
        <BucketIconBadge line={line} />
        <View style={styles.retirementTitleBlock}>
          <ThemedText type="defaultSemiBold">Retirement</ThemedText>
          <ThemedText type="small" numberOfLines={1} style={{ color: colors.textMuted }}>
            {`Current Balance: ${formatCurrency(currentBalance)}`}
          </ThemedText>
        </View>
        <IncludeToggle included={included} onToggle={onToggle} />
      </View>

      {retirementPace ? (
        <View style={[styles.paceSection, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable
            onPress={() => setPaceExpanded((value) => !value)}
            style={styles.paceHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: paceExpanded }}
            accessibilityLabel={paceExpanded ? 'Collapse Retirement Pace' : 'Expand Retirement Pace'}>
            <View style={styles.paceHeaderLeft}>
              <Ionicons name="trending-up-outline" size={16} color={colors.tint} />
              <ThemedText type="eyebrow" style={{ color: colors.textMuted }}>
                Retirement Pace
              </ThemedText>
            </View>
            <Ionicons
              name={paceExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
          {paceExpanded ? (
            <View style={styles.paceBody}>
              {projectedRetirementReadinessPercent != null ? (
                <View style={styles.paceRow}>
                  <ThemedText type="small" style={{ color: colors.textMuted }}>
                    Estimated Retirement Readiness
                  </ThemedText>
                  <ThemedText type="captionMedium">
                    {Math.round(projectedRetirementReadinessPercent)}%
                  </ThemedText>
                </View>
              ) : null}
              {projectedRetirementBalance != null ? (
                <View style={styles.paceRow}>
                  <ThemedText type="small" style={{ color: colors.textMuted }}>
                    Estimated Retirement Balance
                  </ThemedText>
                  <ThemedText type="captionMedium">
                    {formatCurrency(projectedRetirementBalance)}
                  </ThemedText>
                </View>
              ) : null}
              {estimatedRetirementNeed != null ? (
                <View style={styles.paceRow}>
                  <ThemedText type="small" style={{ color: colors.textMuted }}>
                    Estimated Retirement Need
                  </ThemedText>
                  <ThemedText type="captionMedium">
                    {formatCurrency(estimatedRetirementNeed)}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.paceRow}>
                <ThemedText type="small" style={{ color: colors.textMuted }}>
                  Pace Status
                </ThemedText>
                <ThemedText type="captionMedium" style={{ color: colors.textMuted }}>
                  {retirementStatus}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function MyExcessSection({
  summary,
  includedIds,
  onToggle,
  retirementPace,
  projectedRetirementReadinessPercent,
  projectedRetirementBalance,
  estimatedRetirementNeed,
}: MyExcessSectionProps) {
  const { colors } = useAppTheme();
  const retirementStatus = retirementUiStatus(
    projectedRetirementReadinessPercent,
    retirementPace?.paceStatus
  );

  const showInfo = () => {
    showMessage('My Excess', MY_EXCESS_INFO);
  };

  return (
    <View style={styles.root}>
      <Card style={styles.summaryCard} padding="md">
        <View style={styles.totalBlock}>
          <View style={styles.totalLabelRow}>
            <ThemedText type="eyebrow" style={{ color: colors.textMuted }}>
              Sum of All Excess Funds
            </ThemedText>
            <Pressable
              onPress={showInfo}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="About My Excess">
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
          <ThemedText type="sectionTitle" style={{ color: colors.tint }}>
            {formatCurrency(summary.totalExcess)}
          </ThemedText>
        </View>

        {summary.includedLines.length > 0 ? (
          <View style={[styles.summaryBuckets, { borderTopColor: colors.border }]}>
            <ThemedText type="eyebrow" style={{ color: colors.textMuted }}>
              Buckets with excess
            </ThemedText>
            {summary.includedLines.map((line) => (
              <ExcessSummaryRow key={line.id} line={line} retirementStatus={retirementStatus} />
            ))}
          </View>
        ) : (
          <ThemedText type="small" style={{ color: colors.textMuted }}>
            No excess in included buckets right now.
          </ThemedText>
        )}
      </Card>

      <ThemedText type="eyebrow" style={{ color: colors.textMuted }}>
        All buckets
      </ThemedText>

      <View style={styles.allBuckets}>
        {summary.lines.map((line) =>
          line.id === 'retirement' ? (
            <RetirementBucketRow
              key={line.id}
              line={line}
              included={includedIds[line.id] !== false}
              onToggle={(included) => onToggle(line.id, included)}
              retirementPace={retirementPace}
              projectedRetirementReadinessPercent={projectedRetirementReadinessPercent}
              projectedRetirementBalance={projectedRetirementBalance}
              estimatedRetirementNeed={estimatedRetirementNeed}
              retirementStatus={retirementStatus}
            />
          ) : (
            <CompactBucketRow
              key={line.id}
              line={line}
              included={includedIds[line.id] !== false}
              onToggle={(included) => onToggle(line.id, included)}
            />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.md,
  },
  summaryCard: {
    gap: Spacing.md,
  },
  totalBlock: {
    gap: Spacing.xs,
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryBuckets: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryBucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryBucketName: {
    flex: 1,
  },
  allBuckets: {
    gap: Spacing.sm,
  },
  bucketCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bucketText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  includeToggle: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  includeLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  switchScale: {
    transform: [{ scaleX: SWITCH_SCALE }, { scaleY: SWITCH_SCALE }],
    marginRight: -6,
  },
  retirementTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  retirementTitleBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  paceSection: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  paceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  paceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  paceBody: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  paceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
