import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const MIN = 1;
const MAX = 1000;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(500).json({ error: 'Stripe is not configured' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  const raw = Number(body.amount);
  // Authoritative server-side validation — never trust the client amount.
  if (!Number.isFinite(raw) || raw < MIN || raw > MAX) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }

  const unitAmount = Math.round(raw * 100); // smallest currency unit
  const currency = (process.env.STRIPE_CURRENCY ?? 'usd').toLowerCase();
  // Only reflect the request's Origin/Host into the Stripe redirect URLs when it
  // matches the canonical site; otherwise fall back. This stops a client-supplied
  // Origin/Host header from steering the post-payment redirect to any domain.
  const canonical = process.env.CANONICAL_ORIGIN ?? 'https://djset.club';
  const requested = req.headers.origin ?? (req.headers.host ? `https://${req.headers.host}` : canonical);
  const origin = requested === canonical ? requested : canonical;

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: { name: 'DJ SET — Supporter Tip' },
          },
        },
      ],
      success_url: `${origin}/?tip=success`,
      cancel_url: `${origin}/?tip=cancel`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout] stripe error', err);
    res.status(500).json({ error: 'Could not start checkout' });
  }
}
