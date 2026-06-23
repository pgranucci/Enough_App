import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthFormLayout } from '@/components/auth/auth-form-layout';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSupabaseAuth } from '@/context/supabase-auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { signUpWithPassword, configured } = useSupabaseAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!configured) {
      setError('Supabase is not configured. Add your .env file first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: signUpError } = await signUpWithPassword(email.trim(), password);
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setMessage('Account created. If email confirmation is enabled, check your inbox — then sign in.');
    setTimeout(() => router.replace('/(auth)/login'), 1500);
  };

  return (
    <AuthFormLayout
      title="Create account"
      subtitle="Your financial plan will be saved securely to your account.">
      <View style={styles.field}>
        <ThemedText type="captionMedium">Email</ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="captionMedium">Password</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
        />
      </View>

      {error ? (
        <ThemedText type="small" style={{ color: '#B45309' }}>
          {error}
        </ThemedText>
      ) : null}
      {message ? (
        <ThemedText type="small" style={{ color: colors.tint }}>
          {message}
        </ThemedText>
      ) : null}

      <Pressable
        onPress={handleSignUp}
        disabled={submitting}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.tint, opacity: pressed || submitting ? 0.85 : 1 },
        ]}>
        <ThemedText style={styles.primaryButtonText}>
          {submitting ? 'Creating…' : 'Create account'}
        </ThemedText>
      </Pressable>

      <ThemedText type="caption" style={{ color: colors.textMuted, textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/(auth)/login" style={{ color: colors.tint, fontWeight: '600' }}>
          Sign in
        </Link>
      </ThemedText>
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
