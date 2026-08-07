"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { deleteApiKeyRecord, revokeApiKeyRecord } from "./actions";

export function ApiKeyActions({
  keyId,
  isRevoked,
  name,
}: {
  keyId: string;
  isRevoked: boolean;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      {!isRevoked && (
        <Button
          variant="ghost"
          size="icon"
          title="Revoke this key"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await revokeApiKeyRecord(keyId);
              if (result.error) toast.error(result.error);
              else {
                toast.success(`${name} revoked`);
                router.refresh();
              }
            })
          }
        >
          <Ban />
        </Button>
      )}
      <DeleteConfirmButton
        title={`Delete the ${name} key?`}
        description="Any site still using it will start getting 401s immediately."
        onDelete={() => deleteApiKeyRecord(keyId)}
      />
    </div>
  );
}
