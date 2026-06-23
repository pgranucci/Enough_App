import { StyleSheet, View } from 'react-native';

import { FilingStatusExpandable } from '@/components/profile/filing-status-picker';
import { ProfileInfoLabel } from '@/components/profile/profile-info-label';
import { StatePicker } from '@/components/profile/state-picker';
import { RETIREMENT_TAX_LOCATION_INFO, type RetirementInputs } from '@/constants/retirement';
import { Spacing } from '@/constants/theme';

type ProfileRetirementTaxLocationSectionProps = {
  retirement: RetirementInputs;
  onPatch: (patch: Partial<RetirementInputs>) => void;
};

export function ProfileRetirementTaxLocationSection({
  retirement,
  onPatch,
}: ProfileRetirementTaxLocationSectionProps) {
  return (
    <View style={styles.subsection}>
      <ProfileInfoLabel
        label="Retirement State"
        infoMessage={RETIREMENT_TAX_LOCATION_INFO}
      />
      <StatePicker
        modalTitle="Retirement state"
        value={retirement.retirementStateOfResidence}
        onChange={(retirementStateOfResidence) => onPatch({ retirementStateOfResidence })}
      />
      <FilingStatusExpandable
        label="Retirement Tax Filing Status"
        value={retirement.retirementFilingStatus}
        onChange={(retirementFilingStatus) => onPatch({ retirementFilingStatus })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  subsection: {
    gap: Spacing.md,
  },
});
