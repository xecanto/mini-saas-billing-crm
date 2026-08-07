import { NextResponse, type NextRequest } from "next/server";
import { createSafepayClient } from "@/lib/safepay/client";
import { settleInvoiceByTracker } from "@/lib/safepay/settle";
import { getAppUrl } from "@/lib/urls";

// Where the customer's browser lands after Safepay checkout. Safepay has sent
// this back as a form POST and as a GET with query params depending on the
// flow, so accept both.
//
// This is a convenience path, not the source of truth: the customer can close
// the tab before being redirected. The webhook settles the invoice regardless,
// and settleInvoiceByTracker() makes whichever arrives second a no-op.
async function handle(request: NextRequest, invoiceId: string) {
  const params = await readParams(request);
  const tracker = params.get("tracker");
  const sig = params.get("sig");

  const back = (status: string) =>
    NextResponse.redirect(
      `${getAppUrl()}/pay/${invoiceId}?status=${status}`,
      // 303: turn the POST from Safepay into a GET of the invoice page.
      303,
    );

  if (!tracker || !sig) return back("failed");

  const safepay = createSafepayClient();
  if (!safepay.verify.signature({ body: { tracker, sig } })) {
    console.warn("safepay: bad redirect signature for tracker", tracker);
    return back("failed");
  }

  const result = await settleInvoiceByTracker(tracker);

  if (result.status === "not-found") {
    console.warn("safepay: no invoice for tracker", tracker);
    return back("failed");
  }

  return back("paid");
}

async function readParams(request: NextRequest): Promise<URLSearchParams> {
  if (request.method !== "POST") return request.nextUrl.searchParams;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return new URLSearchParams(
      Object.entries(body as Record<string, string>).map(([k, v]) => [
        k,
        String(v),
      ]),
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) return request.nextUrl.searchParams;

  const params = new URLSearchParams();
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params.set(key, value);
  }
  // Safepay has also been observed appending them to the URL on POST.
  for (const [key, value] of request.nextUrl.searchParams) {
    if (!params.has(key)) params.set(key, value);
  }
  return params;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handle(request, id);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handle(request, id);
}
