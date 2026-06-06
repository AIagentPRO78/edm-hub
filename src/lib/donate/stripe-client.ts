import { normalizeAmount } from './amount';

/**
 * Send the chosen amount to the serverless checkout function and redirect the
 * browser to the Stripe-hosted checkout page. The amount is re-validated on the
 * server; this is just the client hop.
 */
export async function startCheckout(amount: number): Promise<void> {
  const norm = normalizeAmount(amount);
  if (!norm.ok) throw new Error(norm.error ?? 'Enter a valid amount');

  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Number(norm.value) }),
  });
  if (!res.ok) throw new Error('Could not start checkout');

  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error('No checkout URL returned');
  window.location.assign(data.url);
}
