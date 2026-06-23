import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { getSupabase } from '@/lib/supabase';

function extractAuthParams(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  return { params, errorCode };
}

/**
 * Exchange tokens from a Supabase auth email link into a persisted session.
 */
export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = extractAuthParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data, error } = await getSupabase().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

/** True when URL carries Supabase auth tokens (after email link). */
export function urlHasAuthTokens(url: string | null) {
  if (!url) return false;
  const { params } = extractAuthParams(url);
  return Boolean(params.access_token && params.refresh_token);
}
