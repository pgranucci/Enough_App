import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getPasswordResetRedirectUrl } from '@/lib/auth-redirect';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import { errorMessage, withTimeout } from '@/utils/async-timeout';

const AUTH_STARTUP_TIMEOUT_MS = 15_000;

type SupabaseAuthContextValue = {
  configured: boolean;
  loading: boolean;
  error: string | null;
  session: Session | null;
  user: User | null;
  recoveryMode: boolean;
  refreshSession: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const refreshSession = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withTimeout(
        getSupabase().auth.getSession(),
        AUTH_STARTUP_TIMEOUT_MS,
        'Authentication check'
      );
      if (error) throw error;
      setSession(data.session);
    } catch (cause) {
      console.warn('Failed to load auth session', cause);
      setSession(null);
      setError(errorMessage(cause, 'Unable to check your sign-in status.'));
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setError(null);
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const supabase = getSupabase();
      void refreshSession();

      const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession) => {
        setSession(nextSession);
        setRecoveryMode(event === 'PASSWORD_RECOVERY');
        setError(null);
        setLoading(false);
      });
      subscription = data.subscription;
    } catch (cause) {
      console.warn('Failed to initialize auth listener', cause);
      setError(errorMessage(cause, 'Unable to initialize authentication.'));
      setLoading(false);
    }

    return () => subscription?.unsubscribe();
  }, [configured, refreshSession]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signUp({ email, password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (!error) {
      setRecoveryMode(false);
    }
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    setRecoveryMode(false);
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      configured,
      loading,
      error,
      session,
      user: session?.user ?? null,
      recoveryMode,
      refreshSession,
      signInWithPassword,
      signUpWithPassword,
      resetPasswordForEmail,
      updatePassword,
      signOut,
    }),
    [
      configured,
      loading,
      error,
      session,
      recoveryMode,
      refreshSession,
      signInWithPassword,
      signUpWithPassword,
      resetPasswordForEmail,
      updatePassword,
      signOut,
    ]
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
}
