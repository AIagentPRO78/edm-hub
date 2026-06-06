/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  readonly VITE_PAYPAL_CURRENCY?: string;
  readonly VITE_PAYPAL_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
