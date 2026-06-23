import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useSupabaseAuth } from '@/context/supabase-auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { isSupabaseConfigured } from '@/lib/env';

const AUTH_ONLY_ROUTES = new Set(['login', 'sign-up', 'forgot-password']);

export function AuthGate({ children }: { children: ReactNode }) {
  const {
    loading: authLoading,
    error: authError,
    session,
    recoveryMode,
    refreshSession,
  } = useSupabaseAuth();
  const {
    loading: dataLoading,
    synced,
    loadError,
    saveStatus,
    retryFailedSave,
    profile,
    refresh,
  } = useAppData();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useAppTheme();
  const authRequired = isSupabaseConfigured();

  useEffect(() => {
    if (!authRequired || authLoading || authError) return;
    if (session && authRequired && dataLoading) return;
    if (session && loadError) return;

    const inAuthGroup = segments[0] === '(auth)';
    const authRoute = inAuthGroup ? segments[1] : undefined;
    const onAuthCallback = segments[0] === 'auth' && segments[1] === 'callback';
    const onResetPassword = authRoute === 'reset-password';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session && !inAuthGroup && !onAuthCallback) {
      router.replace('/(auth)/login' as Href);
      return;
    }

    if (!session) return;

    if (authRequired && !synced) return;

    if (
      !profile.onboardingCompleted &&
      !inOnboarding &&
      !onAuthCallback &&
      !onResetPassword
    ) {
      router.replace('/(onboarding)' as Href);
      return;
    }

    if (profile.onboardingCompleted && inOnboarding) {
      router.replace('/(tabs)' as Href);
      return;
    }

    if (session && inAuthGroup && !onResetPassword && !recoveryMode) {
      if (authRoute && AUTH_ONLY_ROUTES.has(authRoute)) {
        router.replace(
          (profile.onboardingCompleted ? '/(tabs)' : '/(onboarding)') as Href
        );
      }
    }
  }, [
    authRequired,
    authLoading,
    authError,
    session,
    recoveryMode,
    segments,
    router,
    dataLoading,
    synced,
    loadError,
    profile.onboardingCompleted,
  ]);

  const bootLoading =
    authRequired && (authLoading || (session != null && dataLoading));

  if (bootLoading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (authRequired && authError) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="sectionTitle" style={styles.errorTitle}>
          We couldn't check your sign-in status
        </ThemedText>
        <ThemedText type="default" style={{ color: colors.textMuted, textAlign: 'center' }}>
          {authError}
        </ThemedText>
        <Pressable
          onPress={() => {
            void refreshSession();
          }}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: colors.tint, opacity: pressed ? 0.86 : 1 },
          ]}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (authRequired && session && loadError) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="sectionTitle" style={styles.errorTitle}>
          We couldn't load your profile
        </ThemedText>
        <ThemedText type="default" style={{ color: colors.textMuted, textAlign: 'center' }}>
          {loadError.message}
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.textMuted, textAlign: 'center' }}>
          Your existing account was not changed. Retry loading before continuing.
        </ThemedText>
        <Pressable
          onPress={() => {
            void refresh();
          }}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: colors.tint, opacity: pressed ? 0.86 : 1 },
          ]}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <>
      {children}
      {authRequired && session && synced && saveStatus.state !== 'idle' ? (
        <ThemedView
          style={[
            styles.saveStatusBanner,
            {
              backgroundColor: colors.surface,
              borderColor: saveStatus.state === 'error' ? '#B45309' : colors.border,
            },
          ]}>
          {saveStatus.state === 'saving' ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : null}
          <ThemedText
            type="small"
            style={{
              color: saveStatus.state === 'error' ? '#B45309' : colors.textMuted,
              flex: 1,
            }}>
            {saveStatus.message}
          </ThemedText>
          {saveStatus.state === 'error' ? (
            <Pressable
              onPress={() => {
                void retryFailedSave();
              }}
              hitSlop={8}>
              <ThemedText type="captionMedium" style={{ color: colors.tint }}>
                Retry
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorTitle: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.sm,
    minHeight: 48,
    minWidth: 140,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
  saveStatusBanner: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.xl,
    minHeight: 44,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
