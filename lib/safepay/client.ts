import "server-only";
import { Safepay } from "@sfpy/node-sdk";
import type { SafepayEnvironment } from "@sfpy/node-sdk/dist/types";

// Server-only. The v1 secret signs redirects and the webhook secret signs
// webhook bodies - neither may ever reach the browser.
export const SAFEPAY_ENVIRONMENT = (process.env.SAFEPAY_ENVIRONMENT ??
  "sandbox") as SafepayEnvironment;

const API_URLS: Record<string, string> = {
  production: "https://api.getsafepay.com",
  sandbox: "https://sandbox.api.getsafepay.com",
  development: "https://dev.api.getsafepay.com",
};

export const SAFEPAY_API_URL =
  API_URLS[SAFEPAY_ENVIRONMENT] ?? API_URLS.sandbox;

export function isSafepayConfigured(): boolean {
  return Boolean(
    process.env.SAFEPAY_API_KEY &&
      process.env.SAFEPAY_V1_SECRET &&
      process.env.SAFEPAY_WEBHOOK_SECRET,
  );
}

export function createSafepayClient(): Safepay {
  if (!isSafepayConfigured()) {
    throw new Error(
      "Safepay is not configured. Set SAFEPAY_API_KEY, SAFEPAY_V1_SECRET and SAFEPAY_WEBHOOK_SECRET.",
    );
  }

  return new Safepay({
    environment: SAFEPAY_ENVIRONMENT,
    apiKey: process.env.SAFEPAY_API_KEY!,
    v1Secret: process.env.SAFEPAY_V1_SECRET!,
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET!,
  });
}

// Safepay takes amounts in the currency's lowest denomination: PKR in paisa,
// so Rs 3,000 is 300000. Our own amounts are stored in whole rupees as
// numeric(12,2), hence the round-trip helpers.
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(amount: number | string): number {
  return Number(amount) / 100;
}
