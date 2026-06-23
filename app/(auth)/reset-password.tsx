import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthFormLayout } from '@/components/auth/auth-form-layout';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSupabaseAuth } from '@/context/supabase-auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { session, recoveryMode, updatePassword, loading } = useSupabaseAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/forgot-password');
    }
  }, [loading, session, router]);

  const handleUpdate = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/(tabs)');
  };

  if (loading || !session) {
    return null;
  }

  return (
    <AuthFormLayout
      title="Choose a new password"
      subtitle={
        recoveryMode
          ? 'You opened the reset link successfully. Enter a new password below.'
          : 'Enter your new password.'
      }>
      <View style={styles.field}>
        <ThemedText type="captionMedium">New password</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground },
          ]}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="captionMedium">Confirm password</ThemedText>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          placeholder="Repeat password"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground },
          ]}
        />
      </View>

      {error ? (
        <ThemedText type="small" style={{ color: '#B45309' }}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        onPress={handleUpdate}
        disabled={submitting}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.tint, opacity: pressed || submitting ? 0.85 : 1 },
        ]}>
        <ThemedText style={styles.primaryButtonText}>
          {submitting ? 'Saving…' : 'Update password'}
        </ThemedText>
      </Pressable>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    minHeight: 48,
  },
  primaryButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
