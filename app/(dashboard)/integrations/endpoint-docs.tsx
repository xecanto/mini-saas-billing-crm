import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Endpoint({
  method,
  path,
  scope,
  summary,
  sample,
}: {
  method: string;
  path: string;
  scope: string;
  summary: string;
  sample: string;
}) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={method === "GET" ? "secondary" : "default"}>
          {method}
        </Badge>
        <code className="font-mono text-sm">{path}</code>
        <Badge variant="outline">{scope}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{summary}</p>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
        <code>{sample}</code>
      </pre>
    </div>
  );
}

export function EndpointDocs({ baseUrl }: { baseUrl: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Endpoints</CardTitle>
        <p className="text-sm text-muted-foreground">
          Send the key as <code>Authorization: Bearer &lt;key&gt;</code>. CORS is
          open, but never put a key in browser JavaScript — call these from your
          site&apos;s server.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          <Endpoint
            method="GET"
            path="/api/v1/plans"
            scope="read"
            summary="Your public catalogue, for pricing pages. Filter with ?service=POS or ?billing_period=yearly."
            sample={`curl "${baseUrl}/api/v1/plans?billing_period=monthly" \\
  -H "Authorization: Bearer crm_live_..."

# { "plans": [ { "id": "...", "name": "Pro", "amount": 3000,
#   "currency": "PKR", "features": [...],
#   "service": { "name": "POS Software" } } ] }`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/clients/status"
            scope="read"
            summary="Is this email a paying client, on what plan, and when did they last pay? Use it to unlock a Pro area on another site."
            sample={`curl "${baseUrl}/api/v1/clients/status?email=ahmed@example.com" \\
  -H "Authorization: Bearer crm_live_..."

# { "found": true, "active": true,
#   "subscriptions": [ { "name": "POS — Pro", "status": "active",
#     "next_due_date": "2026-09-10", "auto_billing": true } ],
#   "latest_payment": { "amount": 3000, "paid_at": "..." } }`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/checkout"
            scope="checkout"
            summary="A visitor picks a plan on your other site; you post here and redirect them to checkout_url. Creates the client and subscription in this CRM. Recurring plans stay paused until Safepay confirms."
            sample={`curl -X POST "${baseUrl}/api/v1/checkout" \\
  -H "Authorization: Bearer crm_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "plan_id": "<uuid from /api/v1/plans>",
    "email": "ahmed@example.com",
    "name": "Ahmed Khan",
    "phone": "03001234567",
    "redirect_url": "https://yoursite.com/thanks"
  }'

# { "type": "subscription", "checkout_url": "https://...",
#   "subscription_id": "...", "manage_url": "${baseUrl}/manage/..." }`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
