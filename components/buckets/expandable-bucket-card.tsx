import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';

import { AddBucketButton } from '@/components/buckets/add-bucket-button';
import { BucketAccountAssignmentControls } from '@/components/buckets/bucket-account-assignment-controls';
import { BucketIcon } from '@/components/buckets/bucket-icon';
import { DetailRow } from '@/components/buckets/detail-row';
import { EmergencyCoverageControls } from '@/components/buckets/emergency-coverage-controls';
import {
  RETIREMENT_NEED_EXPLANATION,
  RetirementIncomeReplacementControls,
} from '@/components/buckets/retirement-income-replacement-controls';
import { SlushFundControls } from '@/components/buckets/slush-fund-controls';
import { ProgressBar } from '@/components/progress/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { ExpenseInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import type { BucketEntry, BucketGroup, BucketItem } from '@/constants/buckets';
import {
  getBucketFields,
  isBucketGroup,
  isRemovableBucket,
  usesAssignedAccountGoalBucket,
} from '@/constants/buckets';
import type { FinancialAccount } from '@/constants/financial-accounts';
import {
  formatCurrency,
  formatEstimatedCompletionDate,
  formatGoalTimeline,
  formatMonthYear,
  formatPercent,
  formatRate,
} from '@/utils/format';
import { realReturnPercent, toRealValue } from '@/src/core/shared/projection';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ESTIMATED_RETIREMENT_BALANCE_INFO =
  'Roth savings may be adjusted to a pre-tax equivalent using your estimated retirement tax rate. This provides a more accurate estimate of your retirement spending power.';

type ExpandableBucketCardProps = {
  entry: BucketEntry;
  onAddBucket?: () => void;
  expenseControls?: {
    expenses: ExpenseInputs;
    accounts: FinancialAccount[];
    bucketLabelsById: Record<string, string>;
    onPatch: (patch: Partial<ExpenseInputs>) => void;
  };
  retirementControls?: {
    retirement: RetirementInputs;
    householdGrossAnnual: number;
    onPatch: (patch: Partial<RetirementInputs>) => void;
  };
  onRemoveBucket?: (bucketId: string) => void;
  onEditBucket?: (bucket: BucketItem) => void;
};

function retirementProjectedGrossReal(bucket: BucketItem): number {
  if (bucket.projectedGrossEquivalent == null) return 0;
  const infl = bucket.annualInflationRate / 100;
  return Math.round(toRealValue(bucket.projectedGrossEquivalent, infl, bucket.yearsUntilTarget));
}

function BucketDetails({
  bucket,
  mutedText,
  showName,
}: {
  bucket: BucketItem;
  mutedText: string;
  showName?: boolean;
}) {
  const isRoth = bucket.accountType === 'roth';
  const isAssignedAccountGoal =
    usesAssignedAccountGoalBucket(bucket.id) && bucket.id !== 'retirement';
  const isRetirementBucket = bucket.id === 'retirement';
  const isRetirementInvestment =
    bucket.accountType === 'traditional' || bucket.accountType === 'roth';

  return (
    <View style={styles.detailsBlock}>
      {showName && (
        <View style={styles.subBucketHeader}>
          <ThemedText type="defaultSemiBold">{bucket.name}</ThemedText>
        </View>
      )}
      {isRetirementBucket ? (
        <>
          <DetailRow
            label="Estimated Retirement Need"
            value={formatCurrency(bucket.target)}
            mutedText={mutedText}
            highlight
            infoMessage={RETIREMENT_NEED_EXPLANATION}
          />
          <DetailRow
            label="Estimated Retirement Balance"
            value={formatCurrency(
              bucket.projectedGrossEquivalent ?? bucket.projectedPortfolioAtRetirement ?? 0
            )}
            mutedText={mutedText}
            highlight
            infoMessage={ESTIMATED_RETIREMENT_BALANCE_INFO}
          />
          <DetailRow
            label="Current Amount"
            value={formatCurrency(bucket.current)}
            mutedText={mutedText}
          />
          <DetailRow
            label="Annual Contributions"
            value={formatCurrency(bucket.annualContributions ?? 0)}
            mutedText={mutedText}
          />
        </>
      ) : (
        <DetailRow label="Target amount" value={formatCurrency(bucket.target)} mutedText={mutedText} />
      )}
      {!isRetirementBucket ? (
        <DetailRow
          label={isRoth ? 'Roth balance' : 'Current amount'}
          value={formatCurrency(bucket.current)}
          mutedText={mutedText}
        />
      ) : null}
      {isRoth && bucket.rothGrossEquivalent != null && (
        <DetailRow
          label="Gross-equivalent value"
          value={formatCurrency(bucket.rothGrossEquivalent)}
          mutedText={mutedText}
          highlight
        />
      )}
      {!isAssignedAccountGoal && !isRetirementInvestment && !isRetirementBucket && (
        <DetailRow
          label={isRoth ? 'Projected Roth balance' : 'Projected future value'}
          value={formatCurrency(bucket.projectedFutureValue)}
          mutedText={mutedText}
        />
      )}
      {isRoth && bucket.projectedGrossEquivalent != null && (
        <DetailRow
          label={
            isRetirementInvestment
              ? "Projected gross-equivalent (today's dollars)"
              : 'Projected gross-equivalent'
          }
          value={formatCurrency(
            isRetirementInvestment
              ? retirementProjectedGrossReal(bucket)
              : bucket.projectedGrossEquivalent
          )}
          mutedText={mutedText}
          highlight
        />
      )}
      {!isAssignedAccountGoal && !isRetirementBucket && (
        <DetailRow
          label={
            isRetirementInvestment ? "Projected balance (today's dollars)" : "In today's dollars"
          }
          value={formatCurrency(bucket.projectedFutureValueReal)}
          mutedText={mutedText}
        />
      )}
      {!isAssignedAccountGoal && !isRetirementInvestment && !isRetirementBucket && bucket.inflationAdjustedTarget != null && (
        <DetailRow
          label="Inflation-adjusted target"
          value={formatCurrency(bucket.inflationAdjustedTarget)}
          mutedText={mutedText}
        />
      )}
      {!isAssignedAccountGoal && isRetirementInvestment && (
        <DetailRow
          label="Expected real return (annual)"
          value={formatRate(
            realReturnPercent(bucket.annualGrowthRate, bucket.annualInflationRate)
          )}
          mutedText={mutedText}
        />
      )}
      {!isAssignedAccountGoal && !isRetirementInvestment && !isRetirementBucket && (
        <>
          <DetailRow
            label="Growth rate"
            value={formatRate(bucket.annualGrowthRate)}
            mutedText={mutedText}
          />
          <DetailRow
            label="Inflation assumption"
            value={formatRate(bucket.annualInflationRate)}
            mutedText={mutedText}
          />
        </>
      )}
      {!isAssignedAccountGoal && !isRetirementBucket && (
        <DetailRow
          label="Years until target"
          value={bucket.yearsUntilTarget.toFixed(1)}
          mutedText={mutedText}
        />
      )}
      {isAssignedAccountGoal &&
        (bucket.goalTargetMonth || (bucket.goalHorizonYears != null && bucket.goalHorizonYears > 0)) && (
        <DetailRow
          label="Goal date"
          value={formatGoalTimeline(bucket.goalTargetMonth, bucket.goalHorizonYears)}
          mutedText={mutedText}
        />
      )}
      {!isRetirementBucket ? (
        <DetailRow
          label="Monthly contribution"
          value={formatCurrency(bucket.monthlyContribution)}
          mutedText={mutedText}
        />
      ) : null}
      {!isRetirementBucket ? (
        <DetailRow
          label="Estimated completion"
          value={formatEstimatedCompletionDate(bucket.estimatedCompletionDate)}
          mutedText={mutedText}
        />
      ) : null}
    </View>
  );
}

function BucketAmountLine({
  entry,
  fields,
  isGroup,
  isRetirementBucket,
  mutedColor,
}: {
  entry: BucketEntry;
  fields: ReturnType<typeof getBucketFields>;
  isGroup: boolean;
  isRetirementBucket: boolean;
  mutedColor: string;
}) {
  if (isRetirementBucket && !isGroup) {
    return (
      <ThemedText type="small" numberOfLines={1} style={{ color: mutedColor }}>
        {`Current Balance ${formatCurrency(fields.current)}`}
      </ThemedText>
    );
  }

  return (
    <ThemedText type="small" numberOfLines={1} style={{ color: mutedColor }}>
      {`${formatCurrency(fields.current)} of ${formatCurrency(fields.target)}`}
      {isGroup && entry.id !== 'retirement' ? ` · ${(entry as BucketGroup).children.length} buckets` : ''}
    </ThemedText>
  );
}

export function ExpandableBucketCard({
  entry,
  onAddBucket,
  expenseControls,
  retirementControls,
  onRemoveBucket,
  onEditBucket,
}: ExpandableBucketCardProps) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const fields = getBucketFields(entry);
  const isGroup = isBucketGroup(entry);
  const isRetirementBucket = !isGroup && entry.id === 'retirement';
  const canRemove = !isGroup && isRemovableBucket(entry.id) && onRemoveBucket != null;
  const canEdit = !isGroup && isRemovableBucket(entry.id) && onEditBucket != null;
  const readinessProgress =
    !isGroup && 'readinessProgress' in entry && entry.readinessProgress != null
      ? entry.readinessProgress
      : null;
  const progress =
    readinessProgress != null
      ? readinessProgress
      : fields.target > 0
        ? fields.current / fields.target
        : 0;
  const percent =
    readinessProgress != null
      ? `${Math.round(readinessProgress * 100)}`
      : formatPercent(fields.current, fields.target);
  const accent = entry.accent;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  };

  const confirmRemove = () => {
    if (!canRemove) return;
    Alert.alert(
      'Remove goal?',
      `Remove "${entry.name}" from your buckets? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveBucket?.(entry.id),
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        colors.shadow,
      ]}>
      <View style={styles.header}>
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [styles.headerMain, pressed && styles.headerPressed]}
          accessibilityRole="button"
          accessibilityState={{ expanded }}>
          <View style={[styles.iconBadge, { backgroundColor: `${accent}22` }]}>
            <BucketIcon
              bucketId={entry.id}
              color={accent}
              sourceTemplateId={!isGroup ? entry.sourceTemplateId : undefined}
              bucketName={!isGroup ? entry.name : undefined}
            />
          </View>

          <View style={styles.headerContent}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
              {entry.name}
            </ThemedText>
            <ProgressBar
              progress={progress}
              color={colors.textMuted}
              trackColor={colors.track}
              height={5}
            />
            <BucketAmountLine
              entry={entry}
              fields={fields}
              isGroup={isGroup}
              isRetirementBucket={isRetirementBucket}
              mutedColor={colors.textMuted}
            />
          </View>

          <ThemedText type="captionMedium" style={[styles.percentLabel, { color: colors.textMuted }]}>
            {percent}%
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={toggle}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.headerPressed}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse' : 'Expand'}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-forward'}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {isGroup ? (
            <>
              {entry.children.map((child, index) => (
                <View key={child.id}>
                  <BucketDetails
                    bucket={child}
                    mutedText={colors.textMuted}
                    showName
                  />
                  {index < entry.children.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
              {entry.id === 'custom' && onAddBucket ? (
                <View style={styles.customAddRow}>
                  <AddBucketButton onPress={onAddBucket} iconColor={colors.tint} />
                </View>
              ) : null}
            </>
          ) : (
            <>
              {!isGroup && entry.id === 'emergency' && expenseControls ? (
                <>
                  <BucketAccountAssignmentControls
                    bucketId={entry.id}
                    expenses={expenseControls.expenses}
                    accounts={expenseControls.accounts}
                    bucketLabelsById={expenseControls.bucketLabelsById}
                    onPatch={expenseControls.onPatch}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <EmergencyCoverageControls
                    expenses={expenseControls.expenses}
                    onPatch={expenseControls.onPatch}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </>
              ) : null}
              {!isGroup && entry.id === 'slush' && expenseControls ? (
                <>
                  <BucketAccountAssignmentControls
                    bucketId={entry.id}
                    expenses={expenseControls.expenses}
                    accounts={expenseControls.accounts}
                    bucketLabelsById={expenseControls.bucketLabelsById}
                    onPatch={expenseControls.onPatch}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <SlushFundControls
                    expenses={expenseControls.expenses}
                    onPatch={expenseControls.onPatch}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </>
              ) : null}
              {!isGroup && entry.id === 'retirement' && expenseControls && retirementControls ? (
                <>
                  <BucketAccountAssignmentControls
                    bucketId={entry.id}
                    expenses={expenseControls.expenses}
                    accounts={expenseControls.accounts}
                    bucketLabelsById={expenseControls.bucketLabelsById}
                    onPatch={expenseControls.onPatch}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <RetirementIncomeReplacementControls
                    retirement={retirementControls.retirement}
                    householdGrossAnnual={retirementControls.householdGrossAnnual}
                    onPatch={retirementControls.onPatch}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </>
              ) : null}
              {!isGroup &&
              entry.id !== 'emergency' &&
              entry.id !== 'slush' &&
              entry.id !== 'retirement' &&
              expenseControls ? (
                <>
                  <BucketAccountAssignmentControls
                    bucketId={entry.id}
                    expenses={expenseControls.expenses}
                    accounts={expenseControls.accounts}
                    bucketLabelsById={expenseControls.bucketLabelsById}
                    onPatch={expenseControls.onPatch}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </>
              ) : null}
              <BucketDetails bucket={entry} mutedText={colors.textMuted} />
              {canEdit || canRemove ? (
                <View style={styles.goalActions}>
                  {canEdit ? (
                    <Pressable
                      onPress={() => onEditBucket?.(entry)}
                      hitSlop={8}
                      style={styles.goalActionButton}>
                      <ThemedText type="small" style={{ color: colors.tint }}>
                        Edit Goal
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {canRemove ? (
                    <Pressable onPress={confirmRemove} hitSlop={8} style={styles.goalActionButton}>
                      <ThemedText type="small" style={{ color: '#B45309' }}>
                        Remove Goal
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minWidth: 0,
  },
  headerPressed: {
    opacity: 0.7,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
    gap: Spacing.xs,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
  },
  percentLabel: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 0,
    minWidth: 40,
    textAlign: 'right',
  },
  expanded: {
    gap: Spacing.md,
  },
  detailsBlock: {
    gap: Spacing.sm,
  },
  customAddRow: {
    alignItems: 'flex-end',
    paddingTop: Spacing.xs,
  },
  subBucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  summaryTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  goalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  goalActionButton: {
    alignSelf: 'flex-start',
  },
});
