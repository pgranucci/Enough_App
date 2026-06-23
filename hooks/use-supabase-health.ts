import { useCallback, useState } from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

type HealthState = {
  status: 'idle' | 'checking' | 'ok' | 'error';
  message: string;
};

const MISSING_TABLE_HINT =
  'The todos table does not exist yet. Open Supabase → SQL Editor, paste supabase/todos.sql, and click Run. Then test again.';

function isMissingTableError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    lower.includes('pgrst205') ||
    lower.includes('relation') && lower.includes('does not exist')
  );
}

/**
 * Verifies Supabase URL + API key, then reads from `todos` if the table exists.
 */
export function useSupabaseHealth(tableName = 'todos') {
  const [health, setHealth] = useState<HealthState>({
    status: 'idle',
    message: isSupabaseConfigured()
      ? 'Ready to test connection'
      : 'Add Supabase env vars to .env first',
  });

  const checkConnection = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setHealth({
        status: 'error',
        message: 'Missing EXPO_PUBLIC_SUPABASE_URL or key in .env',
      });
      return;
    }

    setHealth({ status: 'checking', message: 'Connecting…' });

    try {
      const supabase = getSupabase();

      const { error: authError } = await supabase.auth.getSession();
      if (authError) {
        setHealth({ status: 'error', message: authError.message });
        return;
      }

      const { error: tableError } = await supabase.from(tableName).select('id').limit(1);

      if (tableError) {
        if (isMissingTableError(tableError.message)) {
          setHealth({ status: 'error', message: MISSING_TABLE_HINT });
          return;
        }
        setHealth({ status: 'error', message: tableError.message });
        return;
      }

      setHealth({
        status: 'ok',
        message: `Connected — API key works and "${tableName}" is readable`,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unknown error';
      setHealth({ status: 'error', message });
    }
  }, [tableName]);

  return { health, checkConnection, configured: isSupabaseConfigured() };
}
