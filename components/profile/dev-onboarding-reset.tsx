import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { resetOnboardingForDev } from '@/lib/dev/reset-onboarding';

export function DevOnboardingReset() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { profile, updateProfile, refresh } = useAppData();
  const [busy, setBusy] = useState(false);

  if (!__DEV__) {
    return null;
  }

  const handleReset = async () => {
    setBusy(true);
    try {
      await resetOnboardingForDev({
        updateProfile,
        getProfile: () => profile,
        navigate: (href) => router.replace(href),
        refresh,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={() => void handleReset()}
      disabled={busy}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      <ThemedText type="captionMedium" style={{ color: colors.tint }}>
        {busy ? 'Resetting…' : 'Reset onboarding (dev)'}
      </ThemedText>
      <ThemedText type="small" style={{ color: colors.textMuted }}>
        Clears saved wizard progress and sets onboarding incomplete.
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
