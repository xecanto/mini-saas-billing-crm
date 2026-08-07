import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { getAppUrl } from "@/lib/urls";
import type { ApiKey } from "@/types/database";
import { ApiKeyDialog } from "./api-key-dialog";
import { ApiKeyActions } from "./api-key-actions";
import { EndpointDocs } from "./endpoint-docs";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (keys ?? []) as ApiKey[];
  const baseUrl = getAppUrl();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Give your other websites a key so they can show your plans, check
            whether someone is a paying client, and sell subscriptions straight
            into this CRM.
          </p>
        </div>
        <ApiKeyDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API keys</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No keys yet. Create one per website so you can revoke them
              independently.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {list.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {key.revoked_at ? (
                        <Badge variant="outline">Revoked</Badge>
                      ) : (
                        key.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary">
                            {scope}
                          </Badge>
                        ))
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {key.key_prefix}…
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                      {key.last_used_at
                        ? `Last used ${formatDateTime(key.last_used_at)}`
                        : "Never used"}
                    </p>
                    <ApiKeyActions
                      keyId={key.id}
                      isRevoked={!!key.revoked_at}
                      name={key.name}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EndpointDocs baseUrl={baseUrl} />
    </div>
  );
}
