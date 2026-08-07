import "server-only";
import { SAFEPAY_API_URL, toMinorUnits } from "./client";
import type { SubscriptionFrequency } from "@/types/database";

// The Node SDK exposes subscriptions and checkout but not plans, so plans go
// straight to the REST API. Same merchant-secret header the SDK uses for its
// passport token call.
type PlanInterval = "DAY" | "WEEK" | "MONTH" | "YEAR";

const FREQUENCY_TO_INTERVAL: Record<
  SubscriptionFrequency,
  { interval: PlanInterval; interval_count: number }
> = {
  monthly: { interval: "MONTH", interval_count: 1 },
  quarterly: { interval: "MONTH", interval_count: 3 },
  yearly: { interval: "YEAR", interval_count: 1 },
};

export type CreatePlanParams = {
  name: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
};

/**
 * Makes a plan name acceptable to Safepay.
 *
 * Safepay validates `name` and `product` and rejects the whole request with
 * "must be in a valid format" otherwise. Probing the sandbox showed it accepts
 * only letters, digits, spaces, hyphens and underscores - and a hyphen may not
 * stand alone as a word or sit at either end. Our own labels routinely break
 * that, because we join service and plan with an em dash ("POS — Pro"), so
 * every name is normalised here rather than at each call site.
 */
export function toSafepayPlanName(raw: string): string {
  const cleaned = raw
    .normalize("NFKD")
    // Anything outside the allowed set becomes a space rather than vanishing,
    // so "POS—Pro" stays two words instead of becoming "POSPro".
    .replace(/[^A-Za-z0-9 _-]+/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[-_]+|[-_]+$/g, ""))
    .filter(Boolean)
    .join(" ")
    .slice(0, 60)
    .replace(/[-_\s]+$/, "");

  return cleaned || "Subscription";
}

export async function createPlan({
  name,
  amount,
  currency,
  frequency,
}: CreatePlanParams): Promise<{ planId: string }> {
  const { interval, interval_count } = FREQUENCY_TO_INTERVAL[frequency];
  const safeName = toSafepayPlanName(name);

  const res = await fetch(`${SAFEPAY_API_URL}/client/plans/v1/`, {
    method: "POST",
    headers: {
      "X-SFPY-MERCHANT-SECRET": process.env.SAFEPAY_V1_SECRET!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: safeName,
      product: safeName,
      amount: toMinorUnits(amount),
      currency,
      interval,
      interval_count,
      type: "RECURRING",
      active: true,
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      `Safepay rejected the plan (${res.status}): ${JSON.stringify(body).slice(0, 300)}`,
    );
  }

  // Verified against the sandbox: the response is
  // {"data":{"request_id":"","plan_id":"plan_..."}}. Note the trailing slash on
  // the path above - without it the API serves the dashboard HTML with a 200.
  const planId = body?.data?.plan_id;
  if (!planId) {
    throw new Error(
      `Safepay returned no plan id: ${JSON.stringify(body).slice(0, 300)}`,
    );
  }

  return { planId };
}

/**
 * Repricing an existing Safepay plan.
 *
 * Verified against the sandbox: only `PUT` with a trailing slash is accepted -
 * PATCH and the slashless paths return 404/405. Safepay acknowledges with
 * `{"data":{"request_id":""}}` and offers no GET endpoint, so we cannot read
 * the plan back to confirm the new amount stuck. Treat a failure here as
 * important: local rows would say one price while cards are charged another.
 */
export async function updateSafepayPlanAmount({
  planId,
  amount,
  applyToExistingSubscriptions,
}: {
  planId: string;
  amount: number;
  applyToExistingSubscriptions: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${SAFEPAY_API_URL}/client/plans/v1/${planId}/`, {
      method: "PUT",
      headers: {
        "X-SFPY-MERCHANT-SECRET": process.env.SAFEPAY_V1_SECRET!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: toMinorUnits(amount),
        apply_amount_change_on_existing_subscriptions:
          applyToExistingSubscriptions,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `${res.status} ${text.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "request failed" };
  }
}
