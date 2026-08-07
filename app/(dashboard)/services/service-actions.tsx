"use client";

import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { deleteServiceRecord } from "./actions";

export function ServiceActions({ serviceId }: { serviceId: string }) {
  return (
    <DeleteConfirmButton
      title="Delete this service?"
      description="Its plans are deleted too. Existing subscriptions keep their price but lose the plan link."
      onDelete={() => deleteServiceRecord(serviceId)}
    />
  );
}
