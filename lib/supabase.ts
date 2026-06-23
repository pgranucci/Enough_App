import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install';

import { isSupabaseConfigured, requireSupabaseEnv } from '@/lib/env';

let client: SupabaseClient | null = null;

/**
 * Returns the shared Supabase client. Throws if env vars are missing.
 * Check `isSupabaseConfigured()` first if you want to run without Supabase locally.
 */
export function getSupabase(): SupabaseClient {
  if (client) {
    return client;
  }

  const { url, publishableKey } = requireSupabaseEnv();

  client = createClient(url, publishableKey, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

export { isSupabaseConfigured };
