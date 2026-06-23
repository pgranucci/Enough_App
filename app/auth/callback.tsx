import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { createSessionFromUrl, urlHasAuthTokens } from '@/lib/auth-deep-link';
import { isSupabaseConfigured } from '@/lib/env';
import { useAppTheme } from '@/hooks/use-app-theme';
import { errorMessage, withTimeout } from '@/utils/async-timeout';

const AUTH_CALLBACK_TIMEOUT_MS = 15_000;

/**
 * Supabase redirects here after the user taps the password-reset email.
 * Route: enoughapp://auth/callback#access_token=...
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const url = Linking.useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace('/(auth)/login');
      return;
    }

    const processUrl = async (incoming: string | null) => {
      if (!incoming || !urlHasAuthTokens(incoming)) {
        return false;
      }

      try {
        const session = await withTimeout(
          createSessionFromUrl(incoming),
          AUTH_CALLBACK_TIMEOUT_MS,
          'Auth callback'
        );
        if (session) {
          router.replace('/(auth)/reset-password');
          return true;
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not open reset link.');
      }
      return false;
    };

    void (async () => {
      try {
        if (await processUrl(url)) return;

        const initial = await withTimeout(
          Linking.getInitialURL(),
          AUTH_CALLBACK_TIMEOUT_MS,
          'Initial link lookup'
        );
        if (await processUrl(initial)) return;

        if (!url && !initial) {
          setError('No reset data in link. Request a new email from Forgot password.');
        } else {
          setError('Link expired or invalid. Request a new reset email.');
        }
      } catch (cause) {
        setError(errorMessage(cause, 'Could not open reset link.'));
      }
    })();
  }, [url, router]);

  return (
    <ThemedView style={styles.container}>
      {error ? (
        <ThemedText type="caption" style={{ color: '#B45309', textAlign: 'center' }}>
          {error}
        </ThemedText>
      ) : (
        <ActivityIndicator size="large" color={colors.tint} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
});
