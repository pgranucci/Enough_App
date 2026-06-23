import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { FilingStatusExpandable } from '@/components/profile/filing-status-picker';
import { ThemedText } from '@/components/themed-text';
import {
  getHouseholdAnnualIncome,
  getPartnerAnnualIncome,
  type ProfileInputs,
} from '@/constants/profile';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  formatCurrency,
  formatWholeNumberDisplay,
  parseUsdWholeToNumber,
} from '@/utils/format';
import {
  computeProfileAnnualIncome,
  withPartnerIncomeUpdate,
  withProfileIncomeUpdate,
} from '@/utils/profile-income';

type ProfileIncomeTaxesSectionProps = {
  profile: ProfileInputs;
  updateProfile: (patch: Partial<ProfileInputs>) => void;
};

type IncomeInlineFieldProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
};

function IncomeInlineField({ label, value, onChange, placeholder }: IncomeInlineFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.inlineRow}>
      <ThemedText type="captionMedium" style={styles.inlineLabel}>
        {label}
      </ThemedText>
      <View
        style={[
          styles.inlineInputRow,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
        ]}>
        <ThemedText style={[styles.inputAffix, { color: colors.textMuted }]}>$</ThemedText>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.inlineInput, { color: colors.text }]}
        />
      </View>
    </View>
  );
}

type IncomeSectionHeaderProps = {
  icon: 'person' | 'people';
  title: string;
};

function IncomeSectionHeader({ icon, title }: IncomeSectionHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${colors.tint}22` }]}>
        <Ionicons name={icon} size={18} color={colors.tint} />
      </View>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
    </View>
  );
}

type AnnualIncomeFieldsProps = {
  heading?: string;
  headerIcon?: 'person' | 'people';
  grossAmount: number;
  salary: number | null;
  bonusAndCommission: number;
  onSalaryChange: (value: number) => void;
  onBonusAndCommissionChange: (value: number) => void;
};

function AnnualIncomeFields({
  heading,
  headerIcon,
  grossAmount,
  salary,
  bonusAndCommission,
  onSalaryChange,
  onBonusAndCommissionChange,
}: AnnualIncomeFieldsProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.incomeGroup}>
      {heading && headerIcon ? (
        <IncomeSectionHeader icon={headerIcon} title={heading} />
      ) : null}
      <IncomeInlineField
        label="Annual Salary"
        value={formatWholeNumberDisplay(salary ?? 0, { allowZero: true })}
        onChange={(text) => onSalaryChange(parseUsdWholeToNumber(text))}
        placeholder="85,000"
      />
      <IncomeInlineField
        label="Bonus & Commission"
        value={formatWholeNumberDisplay(bonusAndCommission, { allowZero: true })}
        onChange={(text) => onBonusAndCommissionChange(parseUsdWholeToNumber(text))}
        placeholder="0"
      />
      <View style={styles.grossRow}>
        <ThemedText type="defaultSemiBold">Annual Gross Income</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
          {formatCurrency(grossAmount)}
        </ThemedText>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

export function ProfileIncomeTaxesSection({
  profile,
  updateProfile,
}: ProfileIncomeTaxesSectionProps) {
  const { colors } = useAppTheme();
  const withPartner = profile.planningMode === 'partner';

  const yourGross = useMemo(() => computeProfileAnnualIncome(profile), [profile]);
  const householdGross = useMemo(() => getHouseholdAnnualIncome(profile), [profile]);
  const partnerGross = useMemo(() => getPartnerAnnualIncome(profile), [profile]);

  const userHeading = profile.userName.trim()
    ? `${profile.userName.trim()}'s Income`
    : 'Your Income';
  const partnerHeading = profile.partnerName.trim()
    ? `${profile.partnerName.trim()}'s Income`
    : "Partner's Income";

  return (
    <View style={styles.section}>
      <AnnualIncomeFields
        heading={userHeading}
        headerIcon="person"
        grossAmount={yourGross}
        salary={profile.baseAnnualSalary}
        bonusAndCommission={profile.annualBonus + profile.annualCommission}
        onSalaryChange={(baseAnnualSalary) =>
          updateProfile(
            withProfileIncomeUpdate(profile, {
              incomeEntryMode: 'salary',
              baseAnnualSalary,
              hourlyWage: null,
              averageWeeklyHours: null,
            })
          )
        }
        onBonusAndCommissionChange={(amount) =>
          updateProfile(
            withProfileIncomeUpdate(profile, {
              annualBonus: amount,
              annualCommission: 0,
            })
          )
        }
      />

      {withPartner ? (
        <AnnualIncomeFields
          heading={partnerHeading}
          headerIcon="people"
          grossAmount={partnerGross}
          salary={profile.partnerBaseAnnualSalary}
          bonusAndCommission={profile.partnerAnnualBonus + profile.partnerAnnualCommission}
          onSalaryChange={(partnerBaseAnnualSalary) =>
            updateProfile(withPartnerIncomeUpdate(profile, { partnerBaseAnnualSalary }))
          }
          onBonusAndCommissionChange={(amount) =>
            updateProfile(
              withPartnerIncomeUpdate(profile, {
                partnerAnnualBonus: amount,
                partnerAnnualCommission: 0,
              })
            )
          }
        />
      ) : null}

      {withPartner ? (
        <>
          <View
            style={[
              styles.combinedCard,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}>
            <ThemedText type="defaultSemiBold">Combined Gross Income</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
              {formatCurrency(householdGross)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </>
      ) : null}

      <FilingStatusExpandable
        value={profile.filingStatus}
        onChange={(filingStatus) => updateProfile({ filingStatus })}
        headerIcon="document-text-outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.xl,
  },
  incomeGroup: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  inlineLabel: {
    flex: 1,
    minWidth: 0,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    minWidth: 148,
    maxWidth: '46%',
  },
  inputAffix: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  inlineInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.sm,
    textAlign: 'right',
  },
  grossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
  },
  combinedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});
