import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthFormLayout } from '@/components/auth/auth-form-layout';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSupabaseAuth } from '@/context/supabase-auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { signInWithPassword, configured } = useSupabaseAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!configured) {
      setError('Supabase is not configured. Add your .env file first.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <AuthFormLayout
      title="Welcome back"
      subtitle="Sign in to sync your buckets, retirement plan, and profile.">
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
        <View style={styles.labelRow}>
          <ThemedText type="captionMedium">Password</ThemedText>
          <Link href="/(auth)/forgot-password" style={{ color: colors.tint }}>
            <ThemedText type="small" style={{ color: colors.tint }}>
              Forgot password?
            </ThemedText>
          </Link>
        </View>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
        />
      </View>

      {error ? (
        <ThemedText type="small" style={{ color: '#B45309' }}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        onPress={handleLogin}
        disabled={submitting}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.tint, opacity: pressed || submitting ? 0.85 : 1 },
        ]}>
        <ThemedText style={styles.primaryButtonText}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </ThemedText>
      </Pressable>

      <ThemedText type="caption" style={{ color: colors.textMuted, textAlign: 'center' }}>
        No account?{' '}
        <Link href="/(auth)/sign-up" style={{ color: colors.tint, fontWeight: '600' }}>
          Create one
        </Link>
      </ThemedText>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
