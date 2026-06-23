import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthGate } from '@/components/auth/auth-gate';
import { AppPalette } from '@/constants/theme';
import { AppDataProvider } from '@/context/app-data-context';
import { SupabaseAuthProvider } from '@/context/supabase-auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

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
