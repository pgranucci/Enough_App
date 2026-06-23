/**
 * Must match Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 *
 * We always use the app scheme (enoughapp://), never exp:// from Expo Go.
 * Safari cannot open exp:// links — that causes "unable to connect to server".
 */
export const AUTH_CALLBACK_URL = 'enoughapp://auth/callback';

export function getPasswordResetRedirectUrl() {
  return AUTH_CALLBACK_URL;
}
