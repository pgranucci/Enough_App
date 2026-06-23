import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AccountOwnerPicker } from '@/components/profile/account-owner-picker';
import { AccountTypePicker } from '@/components/profile/account-type-picker';
import { ProfileInfoLabel } from '@/components/profile/profile-info-label';
import { InvestmentMixSlider } from '@/components/profile/investment-mix-slider';
import { ProfileInputField } from '@/components/profile/profile-input-field';
import { ProfilePercentInputField } from '@/components/profile/profile-percent-input-field';
import { ThemedText } from '@/components/themed-text';
import {
  accountTotalBalance,
  createEmptyFinancialAccount,
  FINANCIAL_ACCOUNT_TYPE_OPTIONS,
  INVESTMENT_MIX_INFO_MESSAGE,
  withEmployerPlanBalancePatch,
  type FinancialAccount,
  type FinancialAccountType,
} from '@/constants/financial-accounts';
import type { ProfileInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatCurrency, formatWholeNumberDisplay, parseUsdWholeToNumber } from '@/utils/format';
import { syncRetirementFromAccounts } from '@/utils/financial-accounts-sync';

type AccountsAndSavingsSectionProps = {
  profile: ProfileInputs;
  retirement: RetirementInputs;
  updateRetirement: (patch: Partial<RetirementInputs>) => void;
};

function accountTypeLabel(accountType: FinancialAccountType) {
  return (
    FINANCIAL_ACCOUNT_TYPE_OPTIONS.find((option) => option.id === accountType)?.label ??
    'Account'
  );
}

function accountCardTitle(account: FinancialAccount) {
  if (account.name.trim()) return account.name.trim();
  if (account.institution.trim()) return account.institution.trim();
  return accountTypeLabel(account.accountType);
}

function ownerDisplayName(profile: ProfileInputs, owner: FinancialAccount['accountOwner']): string {
  if (owner === 'partner') {
    return profile.partnerName.trim() || 'Partner';
  }
  return profile.userName.trim() || 'You';
}

export function AccountsAndSavingsSection({
  profile,
  retirement,
  updateRetirement,
}: AccountsAndSavingsSectionProps) {
  const { colors } = useAppTheme();
  const accounts = retirement.accounts;
  const withPartner = profile.planningMode === 'partner';
  const selfOwnerLabel = ownerDisplayName(profile, 'self');
  const partnerOwnerLabel = ownerDisplayName(profile, 'partner');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const setExpanded = (id: string, expanded: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const setAccounts = (nextAccounts: FinancialAccount[]) => {
    updateRetirement(syncRetirementFromAccounts(nextAccounts, profile, retirement));
  };

  const removeAccount = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setAccounts(accounts.filter((account) => account.id !== id));
  };

  const addAccount = () => {
    const account = createEmptyFinancialAccount();
    setExpandedIds((prev) => new Set(prev).add(account.id));
    setAccounts([...accounts, account]);
  };

  const updateAccount = (id: string, patch: Partial<FinancialAccount>) => {
    setAccounts(
      accounts.map((account) => {
        if (account.id !== id) return account;
        const next = { ...account, ...patch };
        if (next.accountType === 'savings') {
          next.investmentMix = 'cash';
        }
        return next;
      })
    );
  };

  const changeAccountType = (id: string, accountType: FinancialAccountType) => {
    const current = accounts.find((account) => account.id === id);
    if (!current) return;

    const next: FinancialAccount = {
      ...current,
      accountType,
      investmentMix: accountType === 'savings' ? null : current.investmentMix ?? 'balanced',
      isEmployerPlan: accountType === 'retirement' ? current.isEmployerPlan : false,
      isRoth: accountType === 'retirement' ? current.isRoth : false,
      employeePreTaxContributionPercent:
        accountType === 'retirement' ? current.employeePreTaxContributionPercent : 0,
      employeeRothContributionPercent:
        accountType === 'retirement' ? current.employeeRothContributionPercent : 0,
      employerMatchPercent: accountType === 'retirement' ? current.employerMatchPercent : 0,
      employerProfitSharingPercent:
        accountType === 'retirement' ? current.employerProfitSharingPercent : 0,
      annualContributionDollars:
        accountType === 'retirement' ? current.annualContributionDollars : 0,
      preTaxCurrentValue:
        accountType === 'retirement' && current.isEmployerPlan ? current.preTaxCurrentValue : 0,
      rothCurrentValue:
        accountType === 'retirement' && current.isEmployerPlan ? current.rothCurrentValue : 0,
      currentValue:
        accountType === 'retirement' && current.isEmployerPlan
          ? current.preTaxCurrentValue + current.rothCurrentValue
          : current.currentValue,
      estimatedAnnualSavings: accountType === 'retirement' ? 0 : current.estimatedAnnualSavings,
    };
    updateAccount(id, next);
  };

  return (
    <View style={styles.root}>
      {accounts.length === 0 ? (
        <ProfileInfoLabel
          label="Accounts"
          infoMessage="No accounts added yet. Use the button below when you are ready to add one."
        />
      ) : null}

      {accounts.map((account) => {
        const collapsed = !expandedIds.has(account.id);

        return (
        <View
          key={account.id}
          style={[
            styles.accountCard,
            { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
          ]}>
          <View style={styles.cardHeader}>
            <View style={styles.accountHeaderText}>
              <TextInput
                value={account.name}
                onChangeText={(name) => updateAccount(account.id, { name })}
                placeholder={accountTypeLabel(account.accountType)}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                style={[styles.nicknameInput, { color: colors.text }]}
              />
              {collapsed ? (
                <ThemedText type="small" style={{ color: colors.textMuted }} numberOfLines={1}>
                  {accountTypeLabel(account.accountType)}
                  {withPartner ? ` · ${ownerDisplayName(profile, account.accountOwner)}` : ''}
                  {accountTotalBalance(account) > 0
                    ? ` · ${formatCurrency(accountTotalBalance(account))}`
                    : ''}
                </ThemedText>
              ) : null}
            </View>
            <Pressable
              onPress={() => setExpanded(account.id, collapsed)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: !collapsed }}
              accessibilityLabel={collapsed ? `Expand ${accountCardTitle(account)}` : `Collapse ${accountCardTitle(account)}`}>
              <Ionicons
                name={collapsed ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          {!collapsed ? (
            <View style={styles.accountBody}>

          <View style={styles.field}>
            <ThemedText type="captionMedium">Account Type</ThemedText>
            <AccountTypePicker
              value={account.accountType}
              onChange={(accountType) => changeAccountType(account.id, accountType)}
            />
          </View>

          <ProfileInputField
            label="Institution"
            value={account.institution}
            onChange={(institution) => updateAccount(account.id, { institution })}
            placeholder="Fidelity"
            autoCapitalize="words"
          />

          {withPartner ? (
            <>
              <AccountOwnerPicker
                selfLabel={selfOwnerLabel}
                partnerLabel={partnerOwnerLabel}
                value={account.accountOwner}
                onChange={(accountOwner) => updateAccount(account.id, { accountOwner })}
              />
              {account.accountType === 'retirement' && account.isEmployerPlan ? (
                <ThemedText type="small" style={{ color: colors.textMuted }}>
                  Employer-plan deferral and match use{' '}
                  {ownerDisplayName(profile, account.accountOwner)}&apos;s gross income from
                  Profile → Income & Taxes.
                </ThemedText>
              ) : null}
            </>
          ) : null}

          {account.accountType === 'retirement' ? (
            <>
              <View style={styles.toggleRow}>
                <ThemedText type="captionMedium">Employer Plan</ThemedText>
                <Switch
                  value={account.isEmployerPlan}
                  onValueChange={(isEmployerPlan) => {
                    if (isEmployerPlan) {
                      const preTaxCurrentValue = account.isRoth ? 0 : account.currentValue;
                      const rothCurrentValue = account.isRoth ? account.currentValue : 0;
                      updateAccount(account.id, {
                        isEmployerPlan: true,
                        isRoth: false,
                        preTaxCurrentValue,
                        rothCurrentValue,
                        currentValue: preTaxCurrentValue + rothCurrentValue,
                        annualContributionDollars: 0,
                      });
                    } else {
                      const total = account.preTaxCurrentValue + account.rothCurrentValue;
                      const onlyRoth =
                        total > 0 &&
                        account.rothCurrentValue > 0 &&
                        account.preTaxCurrentValue <= 0;
                      updateAccount(account.id, {
                        isEmployerPlan: false,
                        isRoth: onlyRoth,
                        currentValue: total > 0 ? total : account.currentValue,
                        preTaxCurrentValue: 0,
                        rothCurrentValue: 0,
                        employeePreTaxContributionPercent: 0,
                        employeeRothContributionPercent: 0,
                      });
                    }
                  }}
                  trackColor={{ false: colors.track, true: `${colors.tint}66` }}
                  thumbColor={account.isEmployerPlan ? colors.tint : colors.textSecondary}
                />
              </View>
              {!account.isEmployerPlan ? (
                <View style={styles.toggleRow}>
                  <ThemedText type="captionMedium">Roth Account</ThemedText>
                  <Switch
                    value={account.isRoth}
                    onValueChange={(isRoth) => updateAccount(account.id, { isRoth })}
                    trackColor={{ false: colors.track, true: `${colors.tint}66` }}
                    thumbColor={account.isRoth ? colors.tint : colors.textSecondary}
                  />
                </View>
              ) : null}
            </>
          ) : null}

          {account.accountType === 'retirement' && account.isEmployerPlan ? (
            <>
              <ProfileInputField
                label="Pre-Tax Balance"
                value={formatWholeNumberDisplay(account.preTaxCurrentValue, { allowZero: true })}
                onChange={(text) =>
                  updateAccount(account.id, {
                    ...withEmployerPlanBalancePatch(account, {
                      preTaxCurrentValue: parseUsdWholeToNumber(text),
                    }),
                  })
                }
                placeholder="40,000"
                suffix="$"
                keyboardType="number-pad"
              />
              <ProfileInputField
                label="Roth Balance"
                value={formatWholeNumberDisplay(account.rothCurrentValue, { allowZero: true })}
                onChange={(text) =>
                  updateAccount(account.id, {
                    ...withEmployerPlanBalancePatch(account, {
                      rothCurrentValue: parseUsdWholeToNumber(text),
                    }),
                  })
                }
                placeholder="10,000"
                suffix="$"
                keyboardType="number-pad"
              />
            </>
          ) : (
            <ProfileInputField
              label="Account Current Value"
              value={formatWholeNumberDisplay(account.currentValue, { allowZero: true })}
              onChange={(text) =>
                updateAccount(account.id, { currentValue: parseUsdWholeToNumber(text) })
              }
              placeholder="50,000"
              suffix="$"
              keyboardType="number-pad"
            />
          )}
          {account.accountType !== 'retirement' ? (
            <ProfileInputField
              label="Estimated Annual Savings"
              value={formatWholeNumberDisplay(account.estimatedAnnualSavings, { allowZero: true })}
              onChange={(text) =>
                updateAccount(account.id, {
                  estimatedAnnualSavings: parseUsdWholeToNumber(text),
                })
              }
              placeholder="6,000"
              suffix="$"
              keyboardType="number-pad"
            />
          ) : null}

          {account.accountType === 'retirement' ? (
            <>
              {account.isEmployerPlan ? (
                <>
                  <ProfilePercentInputField
                    label="Pre-Tax Contribution (% of Gross Salary)"
                    value={account.employeePreTaxContributionPercent}
                    onChange={(employeePreTaxContributionPercent) =>
                      updateAccount(account.id, { employeePreTaxContributionPercent })
                    }
                    placeholder="6"
                  />
                  <ProfilePercentInputField
                    label="Roth Contribution (% of Gross Salary)"
                    value={account.employeeRothContributionPercent}
                    onChange={(employeeRothContributionPercent) =>
                      updateAccount(account.id, { employeeRothContributionPercent })
                    }
                    placeholder="2"
                  />
                  <ProfilePercentInputField
                    label="Employer Match (% of Gross Salary)"
                    value={account.employerMatchPercent}
                    onChange={(employerMatchPercent) =>
                      updateAccount(account.id, { employerMatchPercent })
                    }
                    placeholder="3.5"
                  />
                  <ProfilePercentInputField
                    label="Profit Sharing (% of Gross Salary)"
                    value={account.employerProfitSharingPercent}
                    onChange={(employerProfitSharingPercent) =>
                      updateAccount(account.id, { employerProfitSharingPercent })
                    }
                    placeholder="1.25"
                  />
                </>
              ) : (
                <ProfileInputField
                  label="Annual Contribution"
                  value={formatWholeNumberDisplay(account.annualContributionDollars, { allowZero: true })}
                  onChange={(text) =>
                    updateAccount(account.id, {
                      annualContributionDollars: parseUsdWholeToNumber(text),
                    })
                  }
                  placeholder="6,000"
                  suffix="$"
                  keyboardType="number-pad"
                />
              )}
            </>
          ) : null}

          {account.accountType === 'savings' ? (
            <View style={styles.field}>
              <ThemedText type="captionMedium">Investment Mix</ThemedText>
              <ThemedText type="small" style={{ color: colors.textMuted }}>
                Short Term · 0% annual return
              </ThemedText>
            </View>
          ) : null}

          {account.accountType === 'retirement' || account.accountType === 'brokerage' ? (
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <ThemedText type="captionMedium">Investment Mix</ThemedText>
                <Pressable
                  onPress={() => Alert.alert('Investment Mix', INVESTMENT_MIX_INFO_MESSAGE)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="About investment mix">
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
              <InvestmentMixSlider
                value={account.investmentMix}
                onChange={(investmentMix) => updateAccount(account.id, { investmentMix })}
              />
            </View>
          ) : null}

          <Pressable onPress={() => removeAccount(account.id)} hitSlop={8}>
            <ThemedText type="captionMedium" style={{ color: '#B45309' }}>
              Remove Account
            </ThemedText>
          </Pressable>
            </View>
          ) : null}
        </View>
        );
      })}

      <Pressable
        onPress={addAccount}
        style={({ pressed }) => [
          styles.addButton,
          { borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
        ]}>
        <ThemedText type="captionMedium" style={{ color: colors.tint }}>
          + Add Account
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.lg,
  },
  accountCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  accountHeaderText: {
    flex: 1,
    gap: Spacing.xs,
  },
  nicknameInput: {
    width: '100%',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    paddingVertical: 0,
    minHeight: 24,
  },
  accountBody: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  field: {
    gap: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
});
