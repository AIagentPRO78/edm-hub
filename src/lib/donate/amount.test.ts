import { describe, it, expect } from 'vitest';
import { normalizeAmount, DONATION_PRESETS, MIN_AMOUNT, MAX_AMOUNT } from './amount';

describe('normalizeAmount', () => {
  it('accepts each preset and formats to 2 decimals', () => {
    for (const p of DONATION_PRESETS) {
      const r = normalizeAmount(p);
      expect(r.ok).toBe(true);
      expect(r.value).toBe(p.toFixed(2));
    }
  });

  it('accepts a valid custom amount from a string and formats it', () => {
    const r = normalizeAmount('12');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('12.00');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeAmount('  7 ').value).toBe('7.00');
  });

  it('rejects an empty string', () => {
    const r = normalizeAmount('');
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('rejects non-numeric input', () => {
    expect(normalizeAmount('abc').ok).toBe(false);
  });

  it('rejects amounts below the minimum', () => {
    expect(normalizeAmount(MIN_AMOUNT - 0.5).ok).toBe(false);
  });

  it('rejects amounts above the maximum', () => {
    expect(normalizeAmount(MAX_AMOUNT + 1).ok).toBe(false);
  });
});
