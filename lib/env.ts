/**
 * Supabase environment variables (Expo requires the EXPO_PUBLIC_ prefix).
 *
 * Supports the new publishable key or the legacy anon key.
 */
export function getSupabaseEnv() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return {
    url,
    publishableKey,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, publishableKey } = getSupabaseEnv();
  return Boolean(url && publishableKey);
}

export function requireSupabaseEnv() {
  const { url, publishableKey } = getSupabaseEnv();

  if (!url || !publishableKey) {
    throw new Error(
      [
        'Supabase is not configured.',
        'Create a .env file in the project root with:',
        '  EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co',
        '  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key',
        '',
        'Restart the Expo dev server after changing .env.',
      ].join('\n')
    );
  }

  return { url, publishableKey };
}
