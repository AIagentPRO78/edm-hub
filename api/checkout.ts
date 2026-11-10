import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';

// The request/response helpers Vercel's Node.js runtime adds, limited to what
// this handler uses. Declared here so the project does not need @vercel/node,
// whose dependency tree carries unpatched advisories.
type VercelRequest = IncomingMessage & { body?: any };
interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
}

const MIN = 1;
const MAX = 1000;

// Currencies Stripe does not take as "amount x 100": zero-decimal, three-decimal
// and ISK (whole units only). See https://docs.stripe.com/currencies. This
// handler and the tip modal assume a two-decimal currency, so these are refused
// rather than charged at the wrong scale.
const UNSUPPORTED_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
  'bhd', 'jod', 'kwd', 'omr', 'tnd',
  'isk',
]);

// A request that carries an Origin header must come from the canonical site or
// from the host that is serving this function (same-origin, e.g. a preview
// deployment or local dev). Requests without Origin are not browser cross-site
// requests and stay allowed.
function isAllowedOrigin(origin: string, canonical: string, host: string | undefined): boolean {
  if (origin === canonical) return true;
  try {
    return host !== undefined && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const canonical = process.env.CANONICAL_ORIGIN ?? 'https://djset.club';
  const requestOrigin = req.headers.origin;
  if (requestOrigin !== undefined && !isAllowedOrigin(requestOrigin, canonical, req.headers.host)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  // JSON only. A cross-site page can send text/plain or form bodies without a
  // CORS preflight; application/json forces one, and this function answers
  // OPTIONS with 405 and no CORS headers, so the browser never sends the POST.
  const contentType = (req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
  if (contentType !== 'application/json') {
    res.status(415).json({ error: 'Content-Type must be application/json' });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(500).json({ error: 'Stripe is not configured' });
    return;
  }

  const currency = (process.env.STRIPE_CURRENCY ?? 'usd').trim().toLowerCase();
  if (UNSUPPORTED_CURRENCIES.has(currency)) {
    console.error('[checkout] STRIPE_CURRENCY is not a two-decimal currency:', currency);
    res.status(500).json({ error: 'Currency is not supported' });
    return;
  }

  // Vercel parses the JSON lazily, so reading req.body throws on malformed input.
  let body: unknown;
  try {
    body = req.body;
  } catch {
    body = undefined;
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const raw = Number((body as { amount?: unknown }).amount);
  // Authoritative server-side validation — never trust the client amount.
  if (!Number.isFinite(raw) || raw < MIN || raw > MAX) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }

  const unitAmount = Math.round(raw * 100); // smallest currency unit
  // Only reflect the request's Origin/Host into the Stripe redirect URLs when it
  // matches the canonical site; otherwise fall back. This stops a client-supplied
  // Origin/Host header from steering the post-payment redirect to any domain.
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
