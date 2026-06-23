import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  accountTotalBalance,
  FINANCIAL_ACCOUNT_TYPE_OPTIONS,
  type FinancialAccount,
} from '@/constants/financial-accounts';
import type { ExpenseInputs } from '@/constants/profile';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  findBucketForAssignedAccount,
  toggleBucketAccountAssignment,
} from '@/src/core/buckets/account-assignment';
import { formatCurrency } from '@/utils/format';

type BucketAccountAssignmentControlsProps = {
  bucketId: string;
  expenses: ExpenseInputs;
  accounts: FinancialAccount[];
  bucketLabelsById: Record<string, string>;
  onPatch: (patch: Partial<ExpenseInputs>) => void;
};

function accountDisplayName(account: FinancialAccount): string {
  if (account.name.trim()) return account.name.trim();
  if (account.institution.trim()) return account.institution.trim();
  return (
    FINANCIAL_ACCOUNT_TYPE_OPTIONS.find((option) => option.id === account.accountType)?.label ??
    'Account'
  );
}

function bucketLabel(bucketId: string, bucketLabelsById: Record<string, string>): string {
  return bucketLabelsById[bucketId] ?? bucketId;
}

export function BucketAccountAssignmentControls({
  bucketId,
  expenses,
  accounts,
  bucketLabelsById,
  onPatch,
}: BucketAccountAssignmentControlsProps) {
  const { colors } = useAppTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  const assignableAccounts =
    bucketId === 'retirement'
      ? accounts.filter(
          (account) => account.accountType === 'retirement' || account.accountType === 'brokerage'
        )
      : accounts;

  const assignedMap = expenses.bucketAssignedAccountIds ?? {};
  const assignedIds = assignedMap[bucketId] ?? [];
  const assignedNames = assignableAccounts
    .filter((account) => assignedIds.includes(account.id))
    .map((account) => accountDisplayName(account));

  const toggleAssigned = (accountId: string) => {
    const result = toggleBucketAccountAssignment(accountId, bucketId, assignedMap);
    if (!result.ok) {
      const ownerLabel = bucketLabel(result.ownerBucketId, bucketLabelsById);
      Alert.alert(
        'Account already assigned',
        `${accountDisplayName(assignableAccounts.find((account) => account.id === accountId)!)} is already assigned to ${ownerLabel}. Each account can only be linked to one goal. Unassign it there first.`
      );
      return;
    }

    onPatch({
      bucketAssignedAccountIds: result.next,
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <ThemedText type="captionMedium">Accounts Assigned:</ThemedText>
        <Pressable
          onPress={() => setPickerOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Assign accounts to bucket">
          <Ionicons name="add-circle-outline" size={22} color={colors.tint} />
        </Pressable>
      </View>
      {assignedNames.length > 0 ? (
        <ThemedText type="small" style={{ color: colors.textMuted }}>
          {assignedNames.join(' · ')}
        </ThemedText>
      ) : (
        <ThemedText type="small" style={{ color: colors.textMuted }}>
          None
        </ThemedText>
      )}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.canvas }]}
            onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <ThemedText type="sectionTitle">Assign Accounts</ThemedText>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              Each account can only be assigned to one goal.
            </ThemedText>
            <ScrollView keyboardShouldPersistTaps="handled">
              {assignableAccounts.map((account) => {
                const selected = assignedIds.includes(account.id);
                const ownerBucketId = findBucketForAssignedAccount(account.id, assignedMap, bucketId);
                const blocked = ownerBucketId != null && !selected;

                return (
                  <Pressable
                    key={account.id}
                    onPress={() => toggleAssigned(account.id)}
                    style={[
                      styles.option,
                      {
                        borderColor: selected ? colors.tint : colors.border,
                        backgroundColor: selected ? `${colors.tint}14` : colors.surface,
                        opacity: blocked ? 0.55 : 1,
                      },
                    ]}>
                    <View style={styles.optionText}>
                      <ThemedText type="defaultSemiBold">{accountDisplayName(account)}</ThemedText>
                      <ThemedText type="small" style={{ color: colors.textMuted }}>
                        {
                          FINANCIAL_ACCOUNT_TYPE_OPTIONS.find((option) => option.id === account.accountType)
                            ?.label
                        }{' '}
                        · {formatCurrency(accountTotalBalance(account))}
                      </ThemedText>
                      {blocked ? (
                        <ThemedText type="small" style={{ color: colors.textMuted }}>
                          Assigned to {bucketLabel(ownerBucketId, bucketLabelsById)}
                        </ThemedText>
                      ) : null}
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                    ) : blocked ? (
                      <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
                    )}
                  </Pressable>
                );
              })}
              {assignableAccounts.length === 0 ? (
                <ThemedText type="small" style={{ color: colors.textMuted }}>
                  {bucketId === 'retirement'
                    ? 'Add retirement or brokerage accounts in Profile → Accounts and Savings first.'
                    : 'Add accounts in Profile → Accounts and Savings first.'}
                </ThemedText>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
});
