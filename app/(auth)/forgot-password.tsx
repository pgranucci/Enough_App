import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthFormLayout } from '@/components/auth/auth-form-layout';
import { ThemedText } from '@/components/themed-text';
import { AUTH_CALLBACK_URL } from '@/lib/auth-redirect';
import { Radius, Spacing } from '@/constants/theme';
import { useSupabaseAuth } from '@/context/supabase-auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { resetPasswordForEmail, configured } = useSupabaseAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    if (!configured) {
      setError('Supabase is not configured.');
      return;
    }

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: resetError } = await resetPasswordForEmail(trimmed);
    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  };

  return (
    <AuthFormLayout
      title="Reset password"
      subtitle="We will email you a link to choose a new password.">
      <View style={styles.field}>
        <ThemedText type="captionMedium">Email</ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!sent}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground },
          ]}
        />
      </View>

      {sent ? (
        <>
          <ThemedText type="caption" style={{ color: colors.tint }}>
            Check your inbox and tap the reset link on this iPhone. The app should open
            automatically — not Safari.
          </ThemedText>
          <View style={[styles.setupBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <ThemedText type="captionMedium">If Safari shows an error</ThemedText>
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              1. In Supabase → Authentication → URL Configuration, set Site URL to{' '}
              {AUTH_CALLBACK_URL} (not localhost).
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              2. Add this under Redirect URLs: {AUTH_CALLBACK_URL}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              3. Run the app with npx expo run:ios (not Expo Go) so the enoughapp:// link opens
              the app.
            </ThemedText>
          </View>
        </>
      ) : null}

      {error ? (
        <ThemedText type="small" style={{ color: '#B45309' }}>
          {error}
        </ThemedText>
      ) : null}

      {!sent ? (
        <Pressable
          onPress={handleSend}
          disabled={submitting}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.tint, opacity: pressed || submitting ? 0.85 : 1 },
          ]}>
          <ThemedText style={styles.primaryButtonText}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </ThemedText>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText style={styles.primaryButtonText}>Back to sign in</ThemedText>
        </Pressable>
      )}

      <ThemedText type="caption" style={{ color: colors.textMuted, textAlign: 'center' }}>
        Remember your password?{' '}
        <Link href="/(auth)/login" style={{ color: colors.tint, fontWeight: '600' }}>
          Sign in
        </Link>
      </ThemedText>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  setupBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
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
