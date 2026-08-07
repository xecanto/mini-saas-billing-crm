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

export async function createPlan({
  name,
  amount,
  currency,
  frequency,
}: CreatePlanParams): Promise<{ planId: string }> {
  const { interval, interval_count } = FREQUENCY_TO_INTERVAL[frequency];

  const res = await fetch(`${SAFEPAY_API_URL}/client/plans/v1/`, {
    method: "POST",
    headers: {
      "X-SFPY-MERCHANT-SECRET": process.env.SAFEPAY_V1_SECRET!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      product: name,
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
