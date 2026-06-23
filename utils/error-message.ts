/** Readable message for thrown values (handles RN/Hermes where `instanceof Error` can fail). */
export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim()) return err.trim();

  if (!err || typeof err !== 'object') {
    return 'Something went wrong. Please try again.';
  }

  const e = err as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof e.message === 'string' && e.message.trim()) parts.push(e.message.trim());
  if (typeof e.details === 'string' && e.details.trim()) parts.push(e.details.trim());
  if (typeof e.hint === 'string' && e.hint.trim()) parts.push(e.hint.trim());

  if (parts.length > 0) return parts.join(' — ');

  return 'Something went wrong. Please try again.';
}
