// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stripe is stubbed: no test here talks to the network.
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('stripe', () => ({
  default: class FakeStripe {
    checkout = { sessions: { create } };
  },
}));

import handler from '../../api/checkout';

type Req = Parameters<typeof handler>[0];
type Res = Parameters<typeof handler>[1];

interface ReqInit {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** Mimic Vercel's lazy `req.body` getter, which throws on malformed JSON. */
  bodyThrows?: boolean;
}

const JSON_HEADERS = { 'content-type': 'application/json', host: 'djset.club' };

function makeReq(init: ReqInit = {}): Req {
  const req: Record<string, unknown> = {
    method: init.method ?? 'POST',
    headers: init.headers ?? JSON_HEADERS,
  };
  Object.defineProperty(req, 'body', {
    get() {
      if (init.bodyThrows) throw new Error('Invalid JSON');
      return init.body;
    },
  });
  return req as unknown as Req;
}

function makeRes(): { res: Res; statusCode: () => number; body: () => unknown } {
  let code = 0;
  let payload: unknown;
  const res = {
    status(c: number) { code = c; return res; },
    json(b: unknown) { payload = b; return res; },
  };
  return { res: res as unknown as Res, statusCode: () => code, body: () => payload };
}

async function call(init: ReqInit = {}): Promise<{ status: number; body: unknown }> {
  const out = makeRes();
  await handler(makeReq(init), out.res);
  return { status: out.statusCode(), body: out.body() };
}

function lineItem(): { currency: string; unit_amount: number } {
  const args = create.mock.calls[0]?.[0] as {
    line_items: Array<{ price_data: { currency: string; unit_amount: number } }>;
  };
  return args.line_items[0]!.price_data;
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
  vi.stubEnv('STRIPE_SECRET_KEY', 'placeholder-not-a-real-key');
  vi.stubEnv('STRIPE_CURRENCY', undefined);
  vi.stubEnv('CANONICAL_ORIGIN', undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('checkout handler: existing behaviour', () => {
  it('creates a session for a valid same-origin JSON request', async () => {
    const r = await call({ headers: { ...JSON_HEADERS, origin: 'https://djset.club' }, body: { amount: 5 } });
    expect(r).toEqual({ status: 200, body: { url: 'https://checkout.stripe.test/session' } });
    expect(create).toHaveBeenCalledTimes(1);
    expect(lineItem()).toMatchObject({ currency: 'usd', unit_amount: 500 });
  });

  it('rejects non-POST methods', async () => {
    const r = await call({ method: 'GET' });
    expect(r).toEqual({ status: 405, body: { error: 'Method not allowed' } });
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 500 when Stripe is not configured', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', undefined);
    const r = await call({ body: { amount: 5 } });
    expect(r).toEqual({ status: 500, body: { error: 'Stripe is not configured' } });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([0.5, 0, -3, 1000.01, 'abc', undefined, null])('rejects amount %s', async (amount) => {
    const r = await call({ body: { amount } });
    expect(r).toEqual({ status: 400, body: { error: 'Invalid amount' } });
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts the bounds and converts dollars to cents', async () => {
    expect((await call({ body: { amount: 1 } })).status).toBe(200);
    expect(lineItem().unit_amount).toBe(100);
    create.mockClear();
    expect((await call({ body: { amount: 1000 } })).status).toBe(200);
    expect(lineItem().unit_amount).toBe(100000);
    create.mockClear();
    expect((await call({ body: { amount: 12.34 } })).status).toBe(200);
    expect(lineItem().unit_amount).toBe(1234);
  });

  it('returns 500 in the app error shape when Stripe fails', async () => {
    create.mockRejectedValue(new Error('stripe down'));
    const r = await call({ body: { amount: 5 } });
    expect(r).toEqual({ status: 500, body: { error: 'Could not start checkout' } });
  });
});

describe('checkout handler: malformed bodies', () => {
  it('returns 400 when reading the JSON body throws', async () => {
    const r = await call({ bodyThrows: true });
    expect(r).toEqual({ status: 400, body: { error: 'Invalid request body' } });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['an array', [5]],
    ['a string', '{"amount":5}'],
    ['a number', 5],
    ['missing', undefined],
  ])('returns 400 when the JSON body is %s', async (_label, body) => {
    const r = await call({ body });
    expect(r).toEqual({ status: 400, body: { error: 'Invalid request body' } });
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['{not json', 'null'])('does not throw on the text/plain body %s', async (body) => {
    const r = await call({ headers: { 'content-type': 'text/plain', host: 'djset.club' }, body });
    expect(r.status).toBe(415);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('checkout handler: content type', () => {
  it.each([
    ['text/plain', '{"amount":1}'],
    ['application/x-www-form-urlencoded', { amount: '1' }],
    ['multipart/form-data; boundary=x', { amount: '1' }],
    ['text/json', { amount: 1 }],
    ['application/jsonp', { amount: 1 }],
  ])('rejects %s with 415', async (contentType, body) => {
    const r = await call({ headers: { 'content-type': contentType, host: 'djset.club' }, body });
    expect(r).toEqual({ status: 415, body: { error: 'Content-Type must be application/json' } });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a request with no content type', async () => {
    const r = await call({ headers: { host: 'djset.club' }, body: { amount: 1 } });
    expect(r.status).toBe(415);
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['application/json; charset=utf-8', 'Application/JSON', 'application/json;charset=UTF-8'])(
    'accepts %s',
    async (contentType) => {
      const r = await call({ headers: { 'content-type': contentType, host: 'djset.club' }, body: { amount: 1 } });
      expect(r.status).toBe(200);
    },
  );
});

describe('checkout handler: origin', () => {
  it.each([
    'https://evil.example',
    'https://djset.club.evil.example',
    'https://evil.example/https://djset.club',
    'http://djset.club:8080',
    'null',
    '',
  ])('rejects the foreign origin "%s" with 403', async (origin) => {
    const r = await call({ headers: { ...JSON_HEADERS, origin }, body: { amount: 1 } });
    expect(r).toEqual({ status: 403, body: { error: 'Origin not allowed' } });
    expect(create).not.toHaveBeenCalled();
  });

  it('allows a request with no Origin header (server to server)', async () => {
    const r = await call({ body: { amount: 1 } });
    expect(r.status).toBe(200);
  });

  it('allows the canonical origin whatever the Host header says', async () => {
    const r = await call({
      headers: { 'content-type': 'application/json', host: 'internal.example', origin: 'https://djset.club' },
      body: { amount: 1 },
    });
    expect(r.status).toBe(200);
  });

  it('honours CANONICAL_ORIGIN', async () => {
    vi.stubEnv('CANONICAL_ORIGIN', 'https://tips.example');
    const ok = await call({
      headers: { 'content-type': 'application/json', host: 'internal.example', origin: 'https://tips.example' },
      body: { amount: 1 },
    });
    expect(ok.status).toBe(200);
    const args = create.mock.calls[0]?.[0] as { success_url: string };
    expect(args.success_url).toBe('https://tips.example/?tip=success');
    const old = await call({
      headers: { 'content-type': 'application/json', host: 'internal.example', origin: 'https://djset.club' },
      body: { amount: 1 },
    });
    expect(old.status).toBe(403);
  });

  it.each([
    ['https://edm-hub-git-branch.vercel.app', 'edm-hub-git-branch.vercel.app'],
    ['http://localhost:3000', 'localhost:3000'],
  ])('allows same-origin requests on a non-canonical host (%s) but pins redirects', async (origin, host) => {
    const r = await call({ headers: { 'content-type': 'application/json', host, origin }, body: { amount: 1 } });
    expect(r.status).toBe(200);
    const args = create.mock.calls[0]?.[0] as { success_url: string; cancel_url: string };
    expect(args.success_url).toBe('https://djset.club/?tip=success');
    expect(args.cancel_url).toBe('https://djset.club/?tip=cancel');
  });
});

describe('checkout handler: currency', () => {
  it('lower-cases a two-decimal currency override and charges amount x 100', async () => {
    vi.stubEnv('STRIPE_CURRENCY', 'EUR');
    expect((await call({ body: { amount: 5 } })).status).toBe(200);
    expect(lineItem()).toMatchObject({ currency: 'eur', unit_amount: 500 });
  });

  it.each([
    // zero-decimal
    'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
    // three-decimal
    'bhd', 'jod', 'kwd', 'omr', 'tnd',
    // whole units only
    'isk',
    // case and whitespace must not slip past the check
    'JPY', ' krw ',
  ])('refuses to create a session when STRIPE_CURRENCY is "%s"', async (currency) => {
    vi.stubEnv('STRIPE_CURRENCY', currency);
    const r = await call({ body: { amount: 5 } });
    expect(r).toEqual({ status: 500, body: { error: 'Currency is not supported' } });
    expect(create).not.toHaveBeenCalled();
  });
});
