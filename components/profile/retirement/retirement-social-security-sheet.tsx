import { Pressable, StyleSheet, View } from 'react-native';

import { RetirementEditSheet } from '@/components/profile/retirement/retirement-edit-sheet';
import { ProfileInputField } from '@/components/profile/profile-input-field';
import { ThemedText } from '@/components/themed-text';
import {
  SOCIAL_SECURITY_MODE_OPTIONS,
  type SocialSecurityInputMode,
} from '@/constants/retirement';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatCurrency, formatWholeNumberDisplay, parseUsdWholeToNumber } from '@/utils/format';
import { parseAgeInput } from '@/utils/profile-age';

const SS_ESTIMATE_INFO =
  'Rough estimate from your current gross income and the age you plan to claim. Not a guarantee of actual Social Security benefits.';

const SS_CLAIM_AGE_INFO =
  'Social Security can generally be collected as early as age 62 or delayed until age 70. Claiming earlier lowers your monthly benefit, while waiting increases it. For most people, full retirement age is 67.';

type RetirementSocialSecuritySheetProps = {
  visible: boolean;
  title: string;
  grossIncome: number;
  mode: SocialSecurityInputMode;
  claimAge: number;
  annualEstimate: number;
  onClose: () => void;
  onModeChange: (mode: SocialSecurityInputMode) => void;
  onClaimAgeChange: (claimAge: number) => void;
  onManualAmountChange: (annual: number) => void;
};

function annualBenefitToMonthly(annual: number): number {
  return Math.max(0, Math.round(annual / 12));
}

function monthlyBenefitToAnnual(monthly: number): number {
  return Math.max(0, Math.round(monthly * 12));
}

export function RetirementSocialSecuritySheet({
  visible,
  title,
  grossIncome,
  mode,
  claimAge,
  annualEstimate,
  onClose,
  onModeChange,
  onClaimAgeChange,
  onManualAmountChange,
}: RetirementSocialSecuritySheetProps) {
  const { colors } = useAppTheme();

  return (
    <RetirementEditSheet visible={visible} title={title} onClose={onClose}>
      <ThemedText type="small" style={{ color: colors.textMuted }}>
        {SS_ESTIMATE_INFO}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="captionMedium">Benefit Input</ThemedText>
        <View style={styles.options}>
          {SOCIAL_SECURITY_MODE_OPTIONS.map((option) => {
            const selected = mode === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => onModeChange(option.id)}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? colors.tint : colors.border,
                    backgroundColor: selected ? `${colors.tint}14` : colors.inputBackground,
                  },
                ]}>
                <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {mode === 'excluded' ? (
        <ThemedText type="small" style={{ color: colors.textMuted }}>
          Social Security is excluded from your retirement plan. No benefit amount is used in
          portfolio or readiness calculations.
        </ThemedText>
      ) : (
        <>
          <ProfileInputField
            label="Age to Collect Benefits"
            infoMessage={SS_CLAIM_AGE_INFO}
            value={claimAge > 0 ? String(claimAge) : ''}
            onChange={(text) => onClaimAgeChange(parseAgeInput(text))}
            placeholder="67"
            keyboardType="number-pad"
          />
          {mode === 'calculated' ? (
            <View
              style={[
                styles.estimateCard,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}>
              <ThemedText
                type="small"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.benefitLabel, { color: colors.textMuted }]}>
                Estimated Monthly Social Security Benefit
              </ThemedText>
              <ThemedText type="sectionTitle" style={{ color: colors.tint }}>
                {formatCurrency(annualBenefitToMonthly(annualEstimate))}
              </ThemedText>
              <ThemedText type="small" style={{ color: colors.textMuted }}>
                Based on {formatCurrency(grossIncome)} gross income today.
              </ThemedText>
            </View>
          ) : (
            <ProfileInputField
              label="Monthly Social Security (Manual)"
              value={formatWholeNumberDisplay(annualBenefitToMonthly(annualEstimate))}
              onChange={(text) =>
                onManualAmountChange(monthlyBenefitToAnnual(parseUsdWholeToNumber(text)))
              }
              placeholder="2,667"
              suffix="$"
              keyboardType="number-pad"
            />
          )}
        </>
      )}
    </RetirementEditSheet>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 48,
    justifyContent: 'center',
  },
  estimateCard: {
    gap: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  benefitLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});
