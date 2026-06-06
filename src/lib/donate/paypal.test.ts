import { describe, it, expect } from 'vitest';
import { paypalSdkSrc } from './paypal';

describe('paypalSdkSrc', () => {
  it('targets the paypal sdk endpoint with the client id, currency and intent', () => {
    const src = paypalSdkSrc('ABC123', 'USD');
    expect(src.startsWith('https://www.paypal.com/sdk/js?')).toBe(true);
    expect(src).toContain('client-id=ABC123');
    expect(src).toContain('currency=USD');
    expect(src).toContain('intent=capture');
  });

  it('defaults the currency to USD', () => {
    expect(paypalSdkSrc('X')).toContain('currency=USD');
  });
});
