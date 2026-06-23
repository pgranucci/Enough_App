import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountsAndSavingsSection } from '@/components/profile/accounts-and-savings-section';
import { ExpensesSection } from '@/components/profile/expenses-section';
import { ProfileIncomeTaxesSection } from '@/components/profile/profile-income-taxes-section';
import { ProfileAssumptionsSection } from '@/components/profile/profile-assumptions-section';
import { ProfileRetirementSection } from '@/components/profile/profile-retirement-section';
import { ProfileCollapsibleSection } from '@/components/profile/profile-collapsible-section';
import { ProfileDateOfBirthField } from '@/components/profile/profile-date-of-birth-field';
import { ProfileInputField } from '@/components/profile/profile-input-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import type { PlanningMode } from '@/constants/profile';
import { useAppData } from '@/context/app-data-context';
import { syncRetirementFromAccounts } from '@/utils/financial-accounts-sync';
import { useAppTheme } from '@/hooks/use-app-theme';
import { clampAge } from '@/utils/profile-age';

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const { loading, profile, updateProfile, retirement, updateRetirement } = useAppData();

  if (loading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  const updatePlanningMode = (planningMode: PlanningMode) => {
    updateProfile({
      planningMode,
      partnerName: planningMode === 'partner' ? profile.partnerName : '',
      partnerAge: planningMode === 'partner' ? profile.partnerAge : 0,
      partnerDateOfBirth: planningMode === 'partner' ? profile.partnerDateOfBirth : '',
      partnerAnnualIncome: planningMode === 'partner' ? profile.partnerAnnualIncome : 0,
      partnerBaseAnnualSalary: planningMode === 'partner' ? profile.partnerBaseAnnualSalary : null,
      partnerAnnualBonus: planningMode === 'partner' ? profile.partnerAnnualBonus : 0,
      partnerAnnualCommission: planningMode === 'partner' ? profile.partnerAnnualCommission : 0,
    });
    if (planningMode === 'solo') {
      const soloProfile = { ...profile, planningMode: 'solo' as const };
      const accounts = retirement.accounts.map((account) =>
        account.accountOwner === 'partner'
          ? { ...account, accountOwner: 'self' as const }
          : account
      );
      updateRetirement({
        ...syncRetirementFromAccounts(accounts, soloProfile, retirement),
        otherIncomeStreams: retirement.otherIncomeStreams.map((stream) =>
          stream.assignedTo === 'partner'
            ? { ...stream, assignedTo: 'self' as const }
            : stream
        ),
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Profile" />

          <ProfileCollapsibleSection
            title="About You"
            icon="person-outline"
            navigationCard
            defaultOpen={false}>
            <View style={styles.aboutYouBody}>
              <View
                style={[
                  styles.fieldGroup,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                ]}>
                <ProfileInputField
                  label="Name"
                  labelType="defaultSemiBold"
                  labelInside
                  embedded
                  value={profile.userName}
                  onChange={(userName) => updateProfile({ userName })}
                  placeholder="Alex"
                  autoCapitalize="words"
                />
                <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
                <ProfileDateOfBirthField
                  label="Date of Birth"
                  labelType="defaultSemiBold"
                  labelInside
                  embedded
                  showAge={false}
                  value={profile.dateOfBirth}
                  onChange={(dateOfBirth, derivedAge) => {
                    const userAge = derivedAge != null ? clampAge(derivedAge) : profile.userAge;
                    updateProfile({ dateOfBirth, userAge });
                    if (derivedAge != null) {
                      updateRetirement({ currentAge: clampAge(derivedAge) });
                    }
                  }}
                />
              </View>
              <View style={[styles.partnerToggleRow, { borderTopColor: colors.border }]}>
                <ThemedText type="defaultSemiBold">Planning with a partner</ThemedText>
                <Switch
                  value={profile.planningMode === 'partner'}
                  onValueChange={(enabled) => updatePlanningMode(enabled ? 'partner' : 'solo')}
                  trackColor={{ false: colors.track, true: colors.tint }}
                  thumbColor="#fff"
                />
              </View>
              {profile.planningMode === 'partner' ? (
                <View
                  style={[
                    styles.fieldGroup,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  ]}>
                  <ProfileInputField
                    label="Name"
                    labelType="defaultSemiBold"
                    labelInside
                    embedded
                    value={profile.partnerName}
                    onChange={(partnerName) => updateProfile({ partnerName })}
                    placeholder="Jordan"
                    autoCapitalize="words"
                  />
                  <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
                  <ProfileDateOfBirthField
                    label="Date of Birth"
                    labelType="defaultSemiBold"
                    labelInside
                    embedded
                    showAge={false}
                    value={profile.partnerDateOfBirth}
                    onChange={(partnerDateOfBirth, derivedAge) => {
                      updateProfile({
                        partnerDateOfBirth,
                        partnerAge:
                          derivedAge != null ? clampAge(derivedAge) : profile.partnerAge,
                      });
                    }}
                  />
                </View>
              ) : null}
            </View>
          </ProfileCollapsibleSection>

          <ProfileCollapsibleSection
            title="Income & Taxes"
            icon="wallet-outline"
            navigationCard
            defaultOpen={false}>
            <ProfileIncomeTaxesSection profile={profile} updateProfile={updateProfile} />
          </ProfileCollapsibleSection>

          <ProfileCollapsibleSection
            title="Expenses"
            icon="receipt-outline"
            navigationCard
            defaultOpen={false}>
            <ExpensesSection
              expenses={profile.expenses}
              updateProfile={updateProfile}
              embedded
            />
          </ProfileCollapsibleSection>

          <ProfileCollapsibleSection
            title="Accounts & Savings"
            materialCommunityIcon="bank-outline"
            navigationCard
            defaultOpen={false}>
            <AccountsAndSavingsSection
              profile={profile}
              retirement={retirement}
              updateRetirement={updateRetirement}
            />
          </ProfileCollapsibleSection>

          <ProfileCollapsibleSection
            title="Retirement"
            icon="trending-up-outline"
            navigationCard
            defaultOpen={false}>
            <ProfileRetirementSection
              profile={profile}
              retirement={retirement}
              updateRetirement={updateRetirement}
            />
          </ProfileCollapsibleSection>

          <ProfileCollapsibleSection
            title="Assumptions"
            icon="options-outline"
            navigationCard
            defaultOpen={false}>
            <ProfileAssumptionsSection
              planningMode={profile.planningMode}
              retirement={retirement}
              updateRetirement={updateRetirement}
            />
          </ProfileCollapsibleSection>

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
    gap: Spacing.lg,
  },
  aboutYouBody: {
    gap: Spacing.lg,
  },
  fieldGroup: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: 'hidden',
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
  },
  partnerToggleRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
});
