export interface PayPalOrderActions {
  order: {
    create(options: {
      intent?: string;
      purchase_units: Array<{
        amount: { value: string; currency_code: string };
        description?: string;
      }>;
    }): Promise<string>;
    capture(): Promise<unknown>;
  };
}

export interface PayPalButtonsConfig {
  style?: Record<string, string>;
  createOrder: (data: unknown, actions: PayPalOrderActions) => Promise<string>;
  onApprove: (data: unknown, actions: PayPalOrderActions) => Promise<void>;
  onError?: (err: unknown) => void;
  onCancel?: () => void;
}

export interface PayPalButtonsInstance {
  render(container: HTMLElement): Promise<void>;
}

export interface PayPalNamespace {
  Buttons(config: PayPalButtonsConfig): PayPalButtonsInstance;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

/**
 * Nonce shared between the CSP `script-src` directive (vercel.json) and the
 * PayPal SDK's `data-csp-nonce` attribute. PayPal stamps this onto the inline
 * scripts it injects so they satisfy a strict CSP without `'unsafe-inline'`.
 */
export const PAYPAL_CSP_NONCE = 'ZGpzZXQtcGF5cGFsLW5vbmNl';

/** Build the PayPal JS SDK URL. The client id is public (safe in the bundle). */
export function paypalSdkSrc(clientId: string, currency = 'USD'): string {
  const params = new URLSearchParams({
    'client-id': clientId,
    currency,
    intent: 'capture',
  });
  return `https://www.paypal.com/sdk/js?${params.toString()}`;
}

let loadPromise: Promise<PayPalNamespace> | null = null;

/** Load the PayPal SDK once, lazily, and resolve the global `paypal` namespace. */
export function loadPayPal(clientId: string, currency = 'USD'): Promise<PayPalNamespace> {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<PayPalNamespace>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = paypalSdkSrc(clientId, currency);
    script.async = true;
    // PayPal propagates this nonce onto the inline scripts it injects, so they
    // pass a strict CSP (matching 'nonce-...' in script-src).
    script.setAttribute('data-csp-nonce', PAYPAL_CSP_NONCE);
    script.onload = () => {
      if (window.paypal) resolve(window.paypal);
      else reject(new Error('PayPal SDK loaded but window.paypal is undefined'));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load the PayPal SDK'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
