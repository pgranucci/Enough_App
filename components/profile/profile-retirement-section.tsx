import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileInputField } from '@/components/profile/profile-input-field';
import { RetirementEditSheet } from '@/components/profile/retirement/retirement-edit-sheet';
import { RetirementOptionSheet } from '@/components/profile/retirement/retirement-option-sheet';
import { RetirementOtherIncomeSheet } from '@/components/profile/retirement/retirement-other-income-sheet';
import {
  RetirementSettingsGroup,
  RetirementSettingsRow,
} from '@/components/profile/retirement/retirement-settings-row';
import { RetirementSocialSecuritySheet } from '@/components/profile/retirement/retirement-social-security-sheet';
import { StatePickerModal } from '@/components/profile/state-picker';
import { FILING_STATUS_OPTIONS, getPartnerAnnualIncome, type ProfileInputs } from '@/constants/profile';
import {
  type OtherIncomeStreamAssignee,
  type RetirementInputs,
  type RetirementOtherIncomeStream,
  type SocialSecurityInputMode,
} from '@/constants/retirement';
import { Spacing } from '@/constants/theme';
import { getStateName } from '@/constants/us-states';
import { formatCurrency } from '@/utils/format';
import { parseAgeInput } from '@/utils/profile-age';
import { computeProfileAnnualIncome } from '@/utils/profile-income';
import { estimateAnnualSocialSecurity } from '@/utils/social-security-estimate';

type ProfileRetirementSectionProps = {
  profile: ProfileInputs;
  retirement: RetirementInputs;
  updateRetirement: (patch: Partial<RetirementInputs>) => void;
};

type SheetKey =
  | 'state'
  | 'filing'
  | 'your-age'
  | 'partner-age'
  | 'your-ss'
  | 'partner-ss'
  | 'your-income'
  | 'partner-income'
  | 'income';

function possessive(name: string, fallback: string): string {
  const trimmed = name.trim();
  return trimmed ? `${trimmed}'s` : fallback;
}

function annualBenefitToMonthly(annual: number): number {
  return Math.max(0, Math.round(annual / 12));
}

function socialSecuritySummary(mode: SocialSecurityInputMode, annualEstimate: number): string {
  if (mode === 'excluded') return 'Excluded';
  return `${formatCurrency(annualBenefitToMonthly(annualEstimate))}/Mo`;
}

function ageLabel(age: number): string {
  return age > 0 ? String(age) : 'Not set';
}

function otherIncomeSummary(
  streams: RetirementOtherIncomeStream[],
  assignee?: OtherIncomeStreamAssignee
): string {
  const filtered = assignee
    ? streams.filter((stream) => stream.assignedTo === assignee)
    : streams;
  if (filtered.length === 0) return 'None';
  if (filtered.length === 1) {
    const stream = filtered[0];
    return stream.name.trim() || '1 income stream';
  }
  return `${filtered.length} income streams`;
}

export function ProfileRetirementSection({
  profile,
  retirement,
  updateRetirement,
}: ProfileRetirementSectionProps) {
  const withPartner = profile.planningMode === 'partner';
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);

  const yourRetirementAgeLabel = useMemo(
    () => (withPartner ? 'Retirement Age' : 'Desired Retirement Age'),
    [withPartner]
  );
  const partnerRetirementAgeLabel = 'Retirement Age';
  const yourGroupTitle = useMemo(
    () => `${possessive(profile.userName, 'Your')} Retirement`,
    [profile.userName]
  );
  const partnerGroupTitle = useMemo(
    () => `${possessive(profile.partnerName, "Partner's")} Retirement`,
    [profile.partnerName]
  );
  const incomeStreamSelfLabel = useMemo(
    () => profile.userName.trim() || 'You',
    [profile.userName]
  );
  const incomeStreamPartnerLabel = useMemo(
    () => profile.partnerName.trim() || 'Partner',
    [profile.partnerName]
  );

  const yourGross = useMemo(() => computeProfileAnnualIncome(profile), [profile]);
  const partnerGross = useMemo(() => getPartnerAnnualIncome(profile), [profile]);

  const calculatedYourSs = useMemo(
    () => estimateAnnualSocialSecurity(yourGross, retirement.socialSecurityClaimAge),
    [yourGross, retirement.socialSecurityClaimAge]
  );
  const calculatedPartnerSs = useMemo(
    () => estimateAnnualSocialSecurity(partnerGross, retirement.partnerSocialSecurityClaimAge),
    [partnerGross, retirement.partnerSocialSecurityClaimAge]
  );

  const yourSsDisplay =
    retirement.socialSecurityMode === 'excluded'
      ? 0
      : retirement.socialSecurityMode === 'calculated'
        ? calculatedYourSs
        : retirement.socialSecurityEstimate;
  const partnerSsDisplay =
    retirement.partnerSocialSecurityMode === 'excluded'
      ? 0
      : retirement.partnerSocialSecurityMode === 'calculated'
        ? calculatedPartnerSs
        : retirement.partnerSocialSecurityEstimate;

  const filingStatusLabel =
    FILING_STATUS_OPTIONS.find((option) => option.id === retirement.retirementFilingStatus)
      ?.label ?? retirement.retirementFilingStatus;

  useEffect(() => {
    const updates: Partial<RetirementInputs> = {};
    if (retirement.socialSecurityMode === 'calculated') {
      const est = estimateAnnualSocialSecurity(yourGross, retirement.socialSecurityClaimAge);
      if (est !== retirement.socialSecurityEstimate) {
        updates.socialSecurityEstimate = est;
      }
    } else if (retirement.socialSecurityMode === 'excluded' && retirement.socialSecurityEstimate !== 0) {
      updates.socialSecurityEstimate = 0;
    }
    if (withPartner && retirement.partnerSocialSecurityMode === 'calculated') {
      const est = estimateAnnualSocialSecurity(
        partnerGross,
        retirement.partnerSocialSecurityClaimAge
      );
      if (est !== retirement.partnerSocialSecurityEstimate) {
        updates.partnerSocialSecurityEstimate = est;
      }
    } else if (
      withPartner &&
      retirement.partnerSocialSecurityMode === 'excluded' &&
      retirement.partnerSocialSecurityEstimate !== 0
    ) {
      updates.partnerSocialSecurityEstimate = 0;
    }
    if (Object.keys(updates).length > 0) {
      updateRetirement(updates);
    }
  }, [
    yourGross,
    partnerGross,
    withPartner,
    retirement.socialSecurityMode,
    retirement.socialSecurityClaimAge,
    retirement.socialSecurityEstimate,
    retirement.partnerSocialSecurityMode,
    retirement.partnerSocialSecurityClaimAge,
    retirement.partnerSocialSecurityEstimate,
    updateRetirement,
  ]);

  const patchRetirement = (patch: Partial<RetirementInputs>) => {
    const next = { ...retirement, ...patch };
    if (next.socialSecurityMode === 'excluded') {
      next.socialSecurityEstimate = 0;
    } else if (
      (patch.socialSecurityMode === 'calculated' || next.socialSecurityMode === 'calculated') &&
      next.socialSecurityMode === 'calculated'
    ) {
      next.socialSecurityEstimate = estimateAnnualSocialSecurity(
        yourGross,
        next.socialSecurityClaimAge
      );
    }
    if (next.partnerSocialSecurityMode === 'excluded') {
      next.partnerSocialSecurityEstimate = 0;
    } else if (
      (patch.partnerSocialSecurityMode === 'calculated' ||
        next.partnerSocialSecurityMode === 'calculated') &&
      next.partnerSocialSecurityMode === 'calculated'
    ) {
      next.partnerSocialSecurityEstimate = estimateAnnualSocialSecurity(
        partnerGross,
        next.partnerSocialSecurityClaimAge
      );
    }
    updateRetirement(next);
  };

  const closeSheet = () => setActiveSheet(null);

  const renderYourRows = (includeOtherIncome: boolean) => (
    <>
      <RetirementSettingsRow
        icon="calendar-outline"
        label={yourRetirementAgeLabel}
        value={ageLabel(retirement.retirementAge)}
        onPress={() => setActiveSheet('your-age')}
      />
      <RetirementSettingsRow
        icon="shield-checkmark-outline"
        label="Social Security"
        value={socialSecuritySummary(retirement.socialSecurityMode, yourSsDisplay)}
        onPress={() => setActiveSheet('your-ss')}
        showDivider={includeOtherIncome}
      />
      {includeOtherIncome ? (
        <RetirementSettingsRow
          icon="cash-outline"
          label="Other Retirement Income"
          value={otherIncomeSummary(retirement.otherIncomeStreams, 'self')}
          onPress={() => setActiveSheet('your-income')}
          showDivider={false}
        />
      ) : null}
    </>
  );

  const renderOtherIncomeRow = (assignee?: OtherIncomeStreamAssignee) => (
    <RetirementSettingsGroup>
      <RetirementSettingsRow
        icon="cash-outline"
        label="Other Retirement Income"
        value={otherIncomeSummary(retirement.otherIncomeStreams, assignee)}
        onPress={() => setActiveSheet('income')}
        showDivider={false}
      />
    </RetirementSettingsGroup>
  );

  const renderPartnerRows = () => (
    <>
      <RetirementSettingsRow
        icon="calendar-outline"
        label={partnerRetirementAgeLabel}
        value={ageLabel(retirement.partnerRetirementAge)}
        onPress={() => setActiveSheet('partner-age')}
      />
      <RetirementSettingsRow
        icon="shield-checkmark-outline"
        label="Social Security"
        value={socialSecuritySummary(retirement.partnerSocialSecurityMode, partnerSsDisplay)}
        onPress={() => setActiveSheet('partner-ss')}
        showDivider
      />
      <RetirementSettingsRow
        icon="cash-outline"
        label="Other Retirement Income"
        value={otherIncomeSummary(retirement.otherIncomeStreams, 'partner')}
        onPress={() => setActiveSheet('partner-income')}
        showDivider={false}
      />
    </>
  );

  const renderSharedRows = () => (
    <>
      <RetirementSettingsRow
        icon="location-outline"
        label="Retirement State"
        value={getStateName(retirement.retirementStateOfResidence)}
        onPress={() => setActiveSheet('state')}
      />
      <RetirementSettingsRow
        icon="document-text-outline"
        label="Tax Filing Status"
        value={filingStatusLabel}
        onPress={() => setActiveSheet('filing')}
        showDivider={false}
      />
    </>
  );

  return (
    <View style={styles.root}>
      {withPartner ? (
        <>
          <RetirementSettingsGroup title={yourGroupTitle}>
            {renderYourRows(true)}
          </RetirementSettingsGroup>

          <RetirementSettingsGroup title={partnerGroupTitle}>
            {renderPartnerRows()}
          </RetirementSettingsGroup>

          <RetirementSettingsGroup title="Shared Settings">{renderSharedRows()}</RetirementSettingsGroup>
        </>
      ) : (
        <>
          <RetirementSettingsGroup>
            <RetirementSettingsRow
              icon="location-outline"
              label="Retirement State"
              value={getStateName(retirement.retirementStateOfResidence)}
              onPress={() => setActiveSheet('state')}
            />
            <RetirementSettingsRow
              icon="document-text-outline"
              label="Tax Filing Status"
              value={filingStatusLabel}
              onPress={() => setActiveSheet('filing')}
            />
            {renderYourRows(false)}
          </RetirementSettingsGroup>
          {renderOtherIncomeRow()}
        </>
      )}

      <StatePickerModal
        visible={activeSheet === 'state'}
        value={retirement.retirementStateOfResidence}
        onChange={(retirementStateOfResidence) =>
          patchRetirement({ retirementStateOfResidence })
        }
        onClose={closeSheet}
        modalTitle="Retirement State"
      />

      <RetirementOptionSheet
        visible={activeSheet === 'filing'}
        title="Tax Filing Status"
        value={retirement.retirementFilingStatus}
        options={FILING_STATUS_OPTIONS}
        onClose={closeSheet}
        onSelect={(retirementFilingStatus) => patchRetirement({ retirementFilingStatus })}
      />

      <RetirementEditSheet
        visible={activeSheet === 'your-age'}
        title={yourRetirementAgeLabel}
        onClose={closeSheet}>
        <ProfileInputField
          label="Age"
          value={retirement.retirementAge > 0 ? String(retirement.retirementAge) : ''}
          onChange={(text) => patchRetirement({ retirementAge: parseAgeInput(text) })}
          placeholder="65"
          keyboardType="number-pad"
        />
      </RetirementEditSheet>

      <RetirementEditSheet
        visible={activeSheet === 'partner-age'}
        title={partnerRetirementAgeLabel}
        onClose={closeSheet}>
        <ProfileInputField
          label="Age"
          value={retirement.partnerRetirementAge > 0 ? String(retirement.partnerRetirementAge) : ''}
          onChange={(text) => patchRetirement({ partnerRetirementAge: parseAgeInput(text) })}
          placeholder="65"
          keyboardType="number-pad"
        />
      </RetirementEditSheet>

      <RetirementSocialSecuritySheet
        visible={activeSheet === 'your-ss'}
        title="Social Security"
        grossIncome={yourGross}
        mode={retirement.socialSecurityMode}
        claimAge={retirement.socialSecurityClaimAge}
        annualEstimate={yourSsDisplay}
        onClose={closeSheet}
        onModeChange={(socialSecurityMode) => patchRetirement({ socialSecurityMode })}
        onClaimAgeChange={(socialSecurityClaimAge) => patchRetirement({ socialSecurityClaimAge })}
        onManualAmountChange={(socialSecurityEstimate) =>
          patchRetirement({ socialSecurityEstimate })
        }
      />

      <RetirementSocialSecuritySheet
        visible={activeSheet === 'partner-ss'}
        title="Social Security"
        grossIncome={partnerGross}
        mode={retirement.partnerSocialSecurityMode}
        claimAge={retirement.partnerSocialSecurityClaimAge}
        annualEstimate={partnerSsDisplay}
        onClose={closeSheet}
        onModeChange={(partnerSocialSecurityMode) => patchRetirement({ partnerSocialSecurityMode })}
        onClaimAgeChange={(partnerSocialSecurityClaimAge) =>
          patchRetirement({ partnerSocialSecurityClaimAge })
        }
        onManualAmountChange={(partnerSocialSecurityEstimate) =>
          patchRetirement({ partnerSocialSecurityEstimate })
        }
      />

      <RetirementOtherIncomeSheet
        visible={activeSheet === 'income'}
        title="Other Retirement Income"
        streams={retirement.otherIncomeStreams}
        withPartner={false}
        selfLabel={incomeStreamSelfLabel}
        partnerLabel={incomeStreamPartnerLabel}
        onClose={closeSheet}
        onChangeStreams={(otherIncomeStreams) => patchRetirement({ otherIncomeStreams })}
      />

      <RetirementOtherIncomeSheet
        visible={activeSheet === 'your-income'}
        title="Other Retirement Income"
        streams={retirement.otherIncomeStreams}
        withPartner={withPartner}
        assigneeFilter="self"
        selfLabel={incomeStreamSelfLabel}
        partnerLabel={incomeStreamPartnerLabel}
        onClose={closeSheet}
        onChangeStreams={(otherIncomeStreams) => patchRetirement({ otherIncomeStreams })}
      />

      <RetirementOtherIncomeSheet
        visible={activeSheet === 'partner-income'}
        title="Other Retirement Income"
        streams={retirement.otherIncomeStreams}
        withPartner={withPartner}
        assigneeFilter="partner"
        selfLabel={incomeStreamSelfLabel}
        partnerLabel={incomeStreamPartnerLabel}
        onClose={closeSheet}
        onChangeStreams={(otherIncomeStreams) => patchRetirement({ otherIncomeStreams })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.lg,
  },
});
