import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DevOnboardingReset } from '@/components/profile/dev-onboarding-reset';
import { ProfileCollapsibleSection } from '@/components/profile/profile-collapsible-section';
import { SupabaseConnectionTestCard } from '@/components/supabase/connection-test-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useSupabaseAuth } from '@/context/supabase-auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { loading, synced } = useAppData();
  const { user, signOut } = useSupabaseAuth();

  if (loading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <ScreenHeader
            title="Settings"
            subtitle={
              synced && user?.email
                ? `Signed in as ${user.email}.`
                : 'Account, sync, and app preferences.'
            }
          />

          {user?.email ? (
            <ProfileCollapsibleSection title="Account" defaultOpen={false}>
              <ThemedText type="captionMedium">Email</ThemedText>
              <ThemedText type="default">{user.email}</ThemedText>
            </ProfileCollapsibleSection>
          ) : null}

          <ProfileCollapsibleSection title="Supabase" defaultOpen={false}>
            <SupabaseConnectionTestCard embedded />
          </ProfileCollapsibleSection>

          {__DEV__ ? (
            <ProfileCollapsibleSection title="Development" defaultOpen={false}>
              <DevOnboardingReset />
            </ProfileCollapsibleSection>
          ) : null}

          {user ? (
            <Pressable
              onPress={() => signOut()}
              style={({ pressed }) => [
                styles.signOutButton,
                { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}>
              <ThemedText type="captionMedium" style={{ color: colors.textMuted }}>
                Sign out
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  signOutButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
