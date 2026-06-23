import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, requireSupabaseEnv } from '@/lib/env';

let client: SupabaseClient | null = null;

/**
 * Web version intentionally skips expo-sqlite localStorage install.
 * This avoids the expo-sqlite wasm resolution error in Metro web builds.
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
