import type { NextRequest } from "next/server";
import { z } from "zod";
import { addDays, format } from "date-fns";
import { authenticateRequest, json, preflight } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSafepayClient,
  isSafepayConfigured,
  toSafepayAmount,
} from "@/lib/safepay/client";
import { createPlan } from "@/lib/safepay/plans";
import { getAppUrl } from "@/lib/urls";
import { DATE_FORMAT } from "@/lib/billing";
import type { SafepayCurrency } from "@sfpy/node-sdk/dist/types";

export function OPTIONS() {
  return preflight();
}

const checkoutSchema = z.object({
  plan_id: z.uuid(),
  email: z.email(),
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
  company: z.string().trim().optional(),
  redirect_url: z.url().optional(),
  cancel_url: z.url().optional(),
});

/**
 * POST /api/v1/checkout
 *
 * A visitor on one of your other websites picks a plan; that site posts here
 * and redirects the visitor to the returned `checkout_url`. The client record
 * and the subscription are created in this CRM, so however somebody signs up -
 * pitched by you or self-serve on a website - there is one place that knows
 * who is on what.
 *
 * Nothing is treated as paid here. The Safepay webhook remains the only thing
 * that marks money as received.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, "checkout");
  if (!auth.ok) return auth.response;

  if (!isSafepayConfigured()) {
    return json({ error: "Payments are not configured" }, { status: 503 });
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json(
      { error: "Invalid request", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const supabase = createAdminClient();

  const { data: plan } = await supabase
    .from("plans")
    .select("*, services(name, status)")
    .eq("id", body.plan_id)
    .eq("is_public", true)
    .eq("status", "active")
    .maybeSingle();

  if (!plan || (plan.services as { status: string } | null)?.status !== "active") {
    return json({ error: "Plan not found or not available" }, { status: 404 });
  }

  const serviceName = (plan.services as { name: string } | null)?.name ?? "";
  const planLabel = [serviceName, plan.name].filter(Boolean).join(" — ");
  const appUrl = getAppUrl();

  // Reuse the client if this email already exists, so a second purchase does
  // not fork them into two records.
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .ilike("email", body.email)
    .maybeSingle();

  let clientId = existing?.id;

  if (!clientId) {
    const { data: created, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: body.name,
        email: body.email,
        // Phone is NOT NULL in the schema and self-serve signups may not have
        // one; the dashboard shows the blank so you can chase it.
        phone: body.phone ?? "",
        company: body.company ?? null,
        service_type: serviceName || null,
      })
      .select("id")
      .single();

    if (clientError || !created) {
      return json({ error: "Could not create the client record" }, { status: 500 });
    }
    clientId = created.id;
  }

  const safepay = createSafepayClient();

  try {
    // ---- one-time purchase: an invoice plus a normal checkout ----
    if (plan.billing_period === "one_time") {
      const today = format(new Date(), DATE_FORMAT);
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          client_id: clientId,
          plan_id: plan.id,
          amount: plan.amount,
          invoice_date: today,
          due_date: format(addDays(new Date(), 7), DATE_FORMAT),
          notes: `Self-serve purchase via ${auth.key.name}: ${planLabel}`,
        })
        .select("id, invoice_number")
        .single();

      if (invoiceError || !invoice) {
        return json({ error: "Could not create the invoice" }, { status: 500 });
      }

      const { token } = await safepay.payments.create({
        amount: toSafepayAmount(plan.amount),
        currency: (plan.currency || "PKR") as SafepayCurrency,
      });

      await supabase
        .from("invoices")
        .update({ safepay_tracker: token })
        .eq("id", invoice.id);

      const checkoutUrl = safepay.checkout.create({
        token,
        orderId: invoice.invoice_number,
        redirectUrl: body.redirect_url ?? `${appUrl}/pay/${invoice.id}/return`,
        cancelUrl: body.cancel_url ?? `${appUrl}/pay/${invoice.id}?status=cancelled`,
        source: "custom",
        webhooks: true,
      });

      return json({
        type: "one_time",
        checkout_url: checkoutUrl,
        client_id: clientId,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: Number(plan.amount),
        currency: plan.currency,
      });
    }

    // ---- recurring: a subscription plus a Safepay subscribe link ----
    let safepayPlanId = plan.safepay_plan_id;
    if (!safepayPlanId) {
      const created = await createPlan({
        name: planLabel || plan.name,
        amount: plan.amount,
        currency: plan.currency || "PKR",
        frequency: plan.billing_period as "monthly" | "quarterly" | "yearly",
      });
      safepayPlanId = created.planId;
      await supabase
        .from("plans")
        .update({ safepay_plan_id: safepayPlanId })
        .eq("id", plan.id);
    }

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        client_id: clientId,
        plan_id: plan.id,
        name: planLabel || plan.name,
        amount: plan.amount,
        currency: plan.currency || "PKR",
        frequency: plan.billing_period as "monthly" | "quarterly" | "yearly",
        next_due_date: format(new Date(), DATE_FORMAT),
        // Not active until Safepay confirms - otherwise the daily job could
        // invoice someone who abandoned the checkout page.
        status: "paused",
      })
      .select("id")
      .single();

    if (subError || !subscription) {
      return json({ error: "Could not create the subscription" }, { status: 500 });
    }

    const checkoutUrl = await safepay.checkout.createSubscription({
      planId: safepayPlanId,
      reference: subscription.id,
      redirectUrl: body.redirect_url ?? `${appUrl}/manage/${subscription.id}`,
      cancelUrl: body.cancel_url ?? appUrl,
    });

    return json({
      type: "subscription",
      checkout_url: checkoutUrl,
      client_id: clientId,
      subscription_id: subscription.id,
      manage_url: `${appUrl}/manage/${subscription.id}`,
      amount: Number(plan.amount),
      currency: plan.currency,
      billing_period: plan.billing_period,
    });
  } catch (e) {
    console.error("api checkout failed", e);
    return json({ error: "Payment gateway error" }, { status: 502 });
  }
}
