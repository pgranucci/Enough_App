import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useSupabaseAuth } from '@/context/supabase-auth-context';
import { useSupabaseHealth } from '@/hooks/use-supabase-health';
import { useAppTheme } from '@/hooks/use-app-theme';

type SupabaseConnectionTestCardProps = {
  /** Omit Card + title when nested in a collapsible profile section. */
  embedded?: boolean;
};

export function SupabaseConnectionTestCard({ embedded = false }: SupabaseConnectionTestCardProps) {
  const { colors } = useAppTheme();
  const { configured: authConfigured, user, loading: authLoading } = useSupabaseAuth();
  const { health, checkConnection, configured } = useSupabaseHealth();

  const inner = (
    <>
      {!embedded ? <ThemedText type="sectionTitle">Supabase</ThemedText> : null}
      <ThemedText type="small" style={{ color: colors.textMuted }}>
        {configured
          ? 'Env vars OK. If the test fails, run supabase/todos.sql in the Supabase SQL Editor.'
          : 'Copy .env.example to .env and add your project URL and API key.'}
      </ThemedText>

      {authConfigured && !authLoading && (
        <ThemedText type="caption" style={{ color: colors.textMuted }}>
          Auth: {user ? `signed in as ${user.email}` : 'no session'}
        </ThemedText>
      )}

      <ThemedText
        type="captionMedium"
        style={{
          color:
            health.status === 'ok'
              ? colors.tint
              : health.status === 'error'
                ? '#B45309'
                : colors.textMuted,
        }}>
        {health.message}
      </ThemedText>

      <Pressable
        onPress={checkConnection}
        disabled={!configured || health.status === 'checking'}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.tint, opacity: pressed || health.status === 'checking' ? 0.85 : 1 },
          !configured && styles.buttonDisabled,
        ]}>
        <ThemedText style={styles.buttonText}>
          {health.status === 'checking' ? 'Testing…' : 'Test connection'}
        </ThemedText>
      </Pressable>
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedRoot}>{inner}</View>;
  }

  return <Card style={styles.card}>{inner}</Card>;
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  embeddedRoot: {
    gap: Spacing.md,
  },
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
