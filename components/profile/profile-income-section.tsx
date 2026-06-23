import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProfileInputField } from '@/components/profile/profile-input-field';
import { ProfileResultRow } from '@/components/profile/profile-result-row';
import { ThemedText } from '@/components/themed-text';
import { INCOME_ENTRY_MODE_OPTIONS, type IncomeEntryMode, type ProfileInputs } from '@/constants/profile';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatCurrency } from '@/utils/format';
import { parseMoneyInput } from '@/utils/income';
import {
  computeProfileAnnualIncome,
  getEffectiveIncomeEntryMode,
  getProfileBonusAndCommission,
  hourlyBaseFromProfile,
  withProfileIncomeUpdate,
} from '@/utils/profile-income';

type ProfileIncomeSectionProps = {
  profile: ProfileInputs;
  updateProfile: (patch: Partial<ProfileInputs>) => void;
  /** e.g. "Your" when planning with a partner */
  subjectLabel?: string;
};

export function ProfileIncomeSection({
  profile,
  updateProfile,
  subjectLabel,
}: ProfileIncomeSectionProps) {
  const { colors } = useAppTheme();
  const mode = getEffectiveIncomeEntryMode(profile);
  const prefix = subjectLabel ? `${subjectLabel} ` : '';
  const bonusCommission = getProfileBonusAndCommission(profile);
  const hourlyBase = useMemo(() => hourlyBaseFromProfile(profile), [profile]);
  const totalGross = useMemo(() => computeProfileAnnualIncome(profile), [profile]);

  const setMode = (incomeEntryMode: IncomeEntryMode) => {
    if (incomeEntryMode === 'hourly') {
      updateProfile(
        withProfileIncomeUpdate(profile, {
          incomeEntryMode: 'hourly',
          baseAnnualSalary: null,
          hourlyWage: profile.hourlyWage ?? 0,
          averageWeeklyHours: profile.averageWeeklyHours ?? 40,
        })
      );
      return;
    }

    const bonus = Math.max(0, profile.annualBonus);
    const commission = Math.max(0, profile.annualCommission);
    const inferredBase =
      profile.baseAnnualSalary ??
      Math.max(profile.annualIncome - bonus - commission, 0);

    updateProfile(
      withProfileIncomeUpdate(profile, {
        incomeEntryMode: 'salary',
        baseAnnualSalary: inferredBase,
        hourlyWage: null,
        averageWeeklyHours: null,
      })
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.field}>
        <ThemedText type="captionMedium">{prefix}Income Type</ThemedText>
        <View style={styles.options}>
          {INCOME_ENTRY_MODE_OPTIONS.map((option) => {
            const selected = option.id === mode;

            return (
              <Pressable
                key={option.id}
                onPress={() => setMode(option.id)}
                style={[
                  styles.option,
                  {
                    backgroundColor: selected ? colors.tint : colors.inputBackground,
                    borderColor: selected ? colors.tint : colors.border,
                  },
                ]}>
                <ThemedText
                  type="caption"
                  style={{ color: selected ? '#fff' : colors.textMuted }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {mode === 'salary' ? (
        <ProfileInputField
          label={`${prefix}Base Annual Salary`}
          value={String(profile.baseAnnualSalary ?? 0)}
          onChange={(text) => {
            updateProfile(
              withProfileIncomeUpdate(profile, {
                incomeEntryMode: 'salary',
                baseAnnualSalary: parseMoneyInput(text),
              })
            );
          }}
          placeholder="85000"
          suffix="$"
          keyboardType="decimal-pad"
        />
      ) : (
        <>
          <ProfileInputField
            label={`${prefix}Hourly Wage`}
            value={String(profile.hourlyWage ?? 0)}
            onChange={(text) => {
              updateProfile(
                withProfileIncomeUpdate(profile, {
                  incomeEntryMode: 'hourly',
                  hourlyWage: parseMoneyInput(text),
                })
              );
            }}
            placeholder="28"
            suffix="$"
            keyboardType="decimal-pad"
          />
          <ProfileInputField
            label={`${prefix}Average Weekly Hours`}
            infoMessage="We estimate annual base salary as hourly wage × average weekly hours × 52 weeks."
            value={String(profile.averageWeeklyHours ?? 0)}
            onChange={(text) => {
              updateProfile(
                withProfileIncomeUpdate(profile, {
                  incomeEntryMode: 'hourly',
                  averageWeeklyHours: parseMoneyInput(text),
                })
              );
            }}
            placeholder="40"
            keyboardType="decimal-pad"
          />
          <ProfileResultRow
            label="Estimated Base Salary From Hourly"
            value={`${formatCurrency(hourlyBase)} / yr`}
          />
        </>
      )}

      <ProfileInputField
        label={`${prefix}Bonus & Commission (Annual)`}
        value={String(bonusCommission)}
        onChange={(text) => {
          const amount = parseMoneyInput(text);
          updateProfile(
            withProfileIncomeUpdate(profile, {
              annualBonus: amount,
              annualCommission: 0,
            })
          );
        }}
        placeholder="5000"
        suffix="$"
        keyboardType="decimal-pad"
      />

      <View
        style={[
          styles.totalRow,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}>
        <ThemedText type="captionMedium">{prefix}Total Annual Gross</ThemedText>
        <ThemedText type="defaultSemiBold">{formatCurrency(totalGross)}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.sm,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
});
