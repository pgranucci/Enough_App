import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AuthGate } from '@/components/auth/auth-gate';
import { AppPalette } from '@/constants/theme';
import { AppDataProvider } from '@/context/app-data-context';
import { SupabaseAuthProvider } from '@/context/supabase-auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

declare global {
  interface Window {
    __ENOUGH_APP_HYDRATED__?: boolean;
  }
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>The app could not start</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Pressable onPress={retry} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: AppPalette.light.tint,
    background: AppPalette.light.canvas,
    card: AppPalette.light.surface,
    border: AppPalette.light.border,
    text: AppPalette.light.text,
  },
};

const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: AppPalette.dark.tint,
    background: AppPalette.dark.canvas,
    card: AppPalette.dark.surface,
    border: AppPalette.dark.border,
    text: AppPalette.dark.text,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__ENOUGH_APP_HYDRATED__ = true;
    }
  }, []);

  return (
    <SupabaseAuthProvider>
      <AppDataProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme}>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth/callback" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AuthGate>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </AppDataProvider>
    </SupabaseAuthProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: '#0B0F14',
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    minWidth: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#2F7D5B',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
