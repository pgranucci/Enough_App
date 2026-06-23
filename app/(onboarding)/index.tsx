import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { LargeInput, OptionButton, OptionStack } from '@/components/onboarding/onboarding-controls';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  getOnboardingSteps,
  type OnboardingStepId,
} from '@/constants/onboarding';
import {
  FILING_STATUS_OPTIONS,
  PLANNING_MODE_OPTIONS,
  type FilingStatus,
  type PlanningMode,
} from '@/constants/profile';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useOnboardingStore } from '@/store/onboarding-store';
import { formatDateOfBirthDisplay } from '@/utils/profile-age';
import {
  ONBOARDING_REQUIRED_STEP_MESSAGE,
  onboardingMoneyValue,
  validateOnboardingStep,
} from '@/utils/onboarding-validation';
import { normalizeFiniteNumber } from '@/utils/numbers';
import { withProfileIncomeUpdate } from '@/utils/profile-income';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatMoneyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return normalizeFiniteNumber(digits, 0).toLocaleString('en-US');
}

function titleForStep(step: OnboardingStepId, partnerName: string) {
  switch (step) {
    case 'name':
      return "What's your name?";
    case 'age':
      return 'When were you born?';
    case 'planningMode':
      return 'How are you planning?';
    case 'partnerDetails':
      return partnerName.trim()
        ? `About ${partnerName.trim()}`
        : 'Tell us about your partner';
    case 'income':
      return 'What do you earn?';
    case 'filingStatus':
      return 'How do you file taxes?';
  }
}

function saveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `We couldn't save your onboarding answers. ${error.message}`;
  }
  return "We couldn't save your onboarding answers. Please try again.";
}

function IncomeFields({
  title,
  baseSalary,
  bonus,
  commission,
  onBaseChange,
  onBonusChange,
  onCommissionChange,
  disabled = false,
}: {
  title: string;
  baseSalary: string;
  bonus: string;
  commission: string;
  onBaseChange: (value: string) => void;
  onBonusChange: (value: string) => void;
  onCommissionChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.incomeSection}>
      <ThemedText type="captionMedium" style={{ color: colors.textMuted }}>
        {title}
      </ThemedText>
      <LargeInput
        label="Base annual salary"
        value={baseSalary}
        onChangeText={(value) => onBaseChange(formatMoneyInput(value))}
        placeholder="85,000"
        keyboardType="number-pad"
        disabled={disabled}
      />
      <LargeInput
        label="Annual bonus (optional)"
        value={bonus}
        onChangeText={(value) => onBonusChange(formatMoneyInput(value))}
        placeholder="0"
        keyboardType="number-pad"
        disabled={disabled}
      />
      <LargeInput
        label="Annual commission (optional)"
        value={commission}
        onChangeText={(value) => onCommissionChange(formatMoneyInput(value))}
        placeholder="0"
        keyboardType="number-pad"
        disabled={disabled}
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { profile, retirement, saveOnboardingCompletion } = useAppData();
  const {
    data,
    stepIndex,
    nextStep,
    previousStep,
    updateData,
    hasHydrated,
  } = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const steps = useMemo(() => getOnboardingSteps(data.planningMode), [data.planningMode]);
  const step = steps[stepIndex] ?? steps[0];
  const {
    userDateOfBirth,
    partnerDateOfBirth,
    userAge,
    partnerAge,
    userBase,
    partnerBase,
    canContinue,
  } = validateOnboardingStep(data, step);

  const animateStep = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const goBack = () => {
    if (isSaving) return;
    setError(null);
    animateStep();
    previousStep();
  };

  const finish = async () => {
    if (isSaving) return;
    if (!data.planningMode || !data.filingStatus || userAge == null || userAge < 1) {
      setError(ONBOARDING_REQUIRED_STEP_MESSAGE);
      return;
    }

    const userBonus = onboardingMoneyValue(data.annualBonus);
    const userCommission = onboardingMoneyValue(data.annualCommission);
    const partnerBonus = onboardingMoneyValue(data.partnerAnnualBonus);
    const partnerCommission = onboardingMoneyValue(data.partnerAnnualCommission);
    const partnerGross =
      data.planningMode === 'partner'
        ? partnerBase + partnerBonus + partnerCommission
        : 0;

    const nextProfile = {
      ...profile,
      ...withProfileIncomeUpdate(profile, {
        userName: data.userName.trim(),
        partnerName: data.planningMode === 'partner' ? data.partnerName.trim() : '',
        userAge,
        dateOfBirth: userDateOfBirth,
        planningMode: data.planningMode,
        partnerAge: data.planningMode === 'partner' && partnerAge != null ? partnerAge : 0,
        partnerDateOfBirth: data.planningMode === 'partner' ? partnerDateOfBirth : '',
        partnerAnnualIncome: partnerGross,
        partnerBaseAnnualSalary: data.planningMode === 'partner' ? partnerBase : null,
        partnerAnnualBonus: data.planningMode === 'partner' ? partnerBonus : 0,
        partnerAnnualCommission: data.planningMode === 'partner' ? partnerCommission : 0,
        filingStatus: data.filingStatus,
        onboardingCompleted: true,
        incomeEntryMode: 'salary',
        baseAnnualSalary: userBase,
        hourlyWage: null,
        averageWeeklyHours: null,
        annualBonus: userBonus,
        annualCommission: userCommission,
      }),
    };
    const nextRetirement = { ...retirement, currentAge: userAge };

    setIsSaving(true);
    setError(null);
    try {
      await saveOnboardingCompletion(nextProfile, nextRetirement);
      router.replace('/(tabs)');
    } catch (saveError) {
      setError(saveErrorMessage(saveError));
      setIsSaving(false);
    }
  };

  const continueFlow = async () => {
    if (isSaving) return;
    if (!canContinue) {
      setError(ONBOARDING_REQUIRED_STEP_MESSAGE);
      return;
    }
    setError(null);
    if (step === 'filingStatus') {
      await finish();
      return;
    }
    animateStep();
    nextStep();
  };

  if (!hasHydrated) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  const partnerIncomeTitle =
    data.partnerName.trim().length > 0
      ? `${data.partnerName.trim()}'s income`
      : "Partner's income";

  return (
    <OnboardingShell
      title={titleForStep(step, data.partnerName)}
      subtitle="Quick answers only. You can refine everything later."
      stepIndex={stepIndex}
      stepCount={steps.length}
      canContinue={canContinue}
      continueLabel={step === 'filingStatus' ? 'Enter app' : 'Continue'}
      isSubmitting={isSaving}
      onBack={stepIndex > 0 ? goBack : undefined}
      onContinue={continueFlow}>
      {step === 'name' ? (
        <LargeInput
          value={data.userName}
          onChangeText={(userName) => updateData({ userName })}
          placeholder="Alex"
          autoCapitalize="words"
          disabled={isSaving}
        />
      ) : null}

      {step === 'age' ? (
        <LargeInput
          value={formatDateOfBirthDisplay(data.userDateOfBirth)}
          onChangeText={(text) =>
            updateData({ userDateOfBirth: formatDateOfBirthDisplay(text) })
          }
          placeholder="MM/DD/YYYY"
          keyboardType="number-pad"
          helper="Used to time your path to retirement."
          disabled={isSaving}
        />
      ) : null}

      {step === 'planningMode' ? (
        <OptionStack>
          {PLANNING_MODE_OPTIONS.map((option) => (
            <OptionButton<PlanningMode>
              key={option.id}
              label={option.label}
              value={option.id}
              selected={data.planningMode === option.id}
              disabled={isSaving}
              onSelect={(planningMode) =>
                updateData({
                  planningMode,
                  partnerName: planningMode === 'solo' ? '' : data.partnerName,
                  partnerDateOfBirth:
                    planningMode === 'solo' ? '' : data.partnerDateOfBirth,
                  partnerBaseAnnualSalary:
                    planningMode === 'solo' ? '' : data.partnerBaseAnnualSalary,
                  partnerAnnualBonus: planningMode === 'solo' ? '' : data.partnerAnnualBonus,
                  partnerAnnualCommission:
                    planningMode === 'solo' ? '' : data.partnerAnnualCommission,
                })
              }
            />
          ))}
        </OptionStack>
      ) : null}

      {step === 'partnerDetails' ? (
        <View style={styles.stack}>
          <LargeInput
            label="Partner's name"
            value={data.partnerName}
            onChangeText={(partnerName) => updateData({ partnerName })}
            placeholder="Jordan"
            autoCapitalize="words"
            disabled={isSaving}
          />
          <LargeInput
            label="Partner's date of birth"
            value={formatDateOfBirthDisplay(data.partnerDateOfBirth)}
            onChangeText={(text) =>
              updateData({ partnerDateOfBirth: formatDateOfBirthDisplay(text) })
            }
            placeholder="MM/DD/YYYY"
            keyboardType="number-pad"
            disabled={isSaving}
          />
        </View>
      ) : null}

      {step === 'income' ? (
        <View style={styles.stack}>
          <IncomeFields
            title="Your income"
            baseSalary={data.baseAnnualSalary}
            bonus={data.annualBonus}
            commission={data.annualCommission}
            onBaseChange={(baseAnnualSalary) => updateData({ baseAnnualSalary })}
            onBonusChange={(annualBonus) => updateData({ annualBonus })}
            onCommissionChange={(annualCommission) => updateData({ annualCommission })}
            disabled={isSaving}
          />
          {data.planningMode === 'partner' ? (
            <IncomeFields
              title={partnerIncomeTitle}
              baseSalary={data.partnerBaseAnnualSalary}
              bonus={data.partnerAnnualBonus}
              commission={data.partnerAnnualCommission}
              onBaseChange={(partnerBaseAnnualSalary) => updateData({ partnerBaseAnnualSalary })}
              onBonusChange={(partnerAnnualBonus) => updateData({ partnerAnnualBonus })}
              onCommissionChange={(partnerAnnualCommission) =>
                updateData({ partnerAnnualCommission })
              }
              disabled={isSaving}
            />
          ) : null}
        </View>
      ) : null}

      {step === 'filingStatus' ? (
        <OptionStack>
          {FILING_STATUS_OPTIONS.map((option) => (
            <OptionButton<FilingStatus>
              key={option.id}
              label={option.label}
              value={option.id}
              selected={data.filingStatus === option.id}
              disabled={isSaving}
              onSelect={(filingStatus) => updateData({ filingStatus })}
            />
          ))}
        </OptionStack>
      ) : null}

      {error ? (
        <ThemedText type="small" style={{ color: '#B45309' }}>
          {error}
        </ThemedText>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    gap: Spacing.xl,
  },
  incomeSection: {
    gap: Spacing.md,
  },
});
