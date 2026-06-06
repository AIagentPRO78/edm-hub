export const DONATION_PRESETS = [1, 3, 5] as const;
export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 1000;

export interface NormalizedAmount {
  ok: boolean;
  /** 2-decimal string for the payment processor, e.g. "3.00". Empty when !ok. */
  value: string;
  error?: string;
}

/**
 * Validate and normalize a donation amount (preset or custom) into the
 * 2-decimal string the payment processor expects. Never trust raw input — clamp the range.
 */
export function normalizeAmount(input: number | string): NormalizedAmount {
  const n = typeof input === 'string' ? Number(input.trim()) : input;
  if (typeof input === 'string' && input.trim() === '') {
    return { ok: false, value: '', error: 'Enter an amount' };
  }
  if (!Number.isFinite(n)) return { ok: false, value: '', error: 'Enter a valid amount' };
  if (n < MIN_AMOUNT) return { ok: false, value: '', error: `Minimum is $${MIN_AMOUNT}` };
  if (n > MAX_AMOUNT) return { ok: false, value: '', error: `Maximum is $${MAX_AMOUNT}` };
  return { ok: true, value: n.toFixed(2) };
}
