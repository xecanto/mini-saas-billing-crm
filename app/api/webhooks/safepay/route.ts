import { NextResponse, type NextRequest } from "next/server";
import { createSafepayClient } from "@/lib/safepay/client";
import { settleInvoiceByTracker } from "@/lib/safepay/settle";
import { recordSubscriptionCharge } from "@/lib/safepay/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";

// Safepay's authoritative notification channel. Everything here must be safe
// to run twice: Safepay retries until it gets a 2xx.
//
// Always answer 200 once the signature checks out. A 5xx makes Safepay retry a
// delivery we have already durably recorded, and a 4xx can make it give up on
// one we simply mishandled - neither helps.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.data) {
    return NextResponse.json({ error: "malformed payload" }, { status: 400 });
  }

  const safepay = createSafepayClient();
  const headers = Object.fromEntries(request.headers.entries());

  if (!safepay.verify.webhook({ body, headers })) {
    console.warn("safepay webhook: signature rejected");
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const data = body.data as Record<string, unknown>;
  const eventType = String(body.type ?? data.type ?? "unknown");
  // Safepay's own delivery id where present, otherwise the tracker/subscription
  // plus event type - enough to make a replay collide with the original.
  const eventId = String(
    body.id ?? data.token ?? data.tracker ?? `${eventType}:${Date.now()}`,
  );
  const dedupeKey = `${eventType}:${eventId}`;

  const supabase = createAdminClient();

  // The primary key does the work: a retry loses this insert and returns early.
  const { error: dedupeError } = await supabase.from("webhook_events").insert({
    id: dedupeKey,
    source: "safepay",
    event_type: eventType,
    payload: body,
  });

  if (dedupeError) {
    // 23505 = unique violation = we have already processed this delivery.
    if (dedupeError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("safepay webhook: could not record event", dedupeError);
  }

  try {
    await dispatch(eventType, data);
  } catch (e) {
    console.error("safepay webhook: handler failed", eventType, e);
  }

  return NextResponse.json({ received: true });
}

async function dispatch(eventType: string, data: Record<string, unknown>) {
  // One-off invoice payments.
  if (
    eventType.startsWith("payment") ||
    eventType === "unknown" ||
    eventType.includes("tracker")
  ) {
    const tracker = String(data.tracker ?? data.token ?? "");
    if (tracker.startsWith("track_")) {
      const result = await settleInvoiceByTracker(tracker);
      console.log("safepay webhook: tracker", tracker, "->", result.status);
      return;
    }
  }

  // Subscription lifecycle.
  if (eventType.startsWith("subscription")) {
    await recordSubscriptionCharge(eventType, data);
    return;
  }

  console.log("safepay webhook: unhandled event", eventType);
}
