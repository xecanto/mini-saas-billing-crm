"use client";

import { Badge } from "@/components/ui/badge";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import type { Plan } from "@/types/database";
import { PlanFormDialog } from "./plan-form-dialog";
import { deletePlanRecord } from "./actions";

export function PlanRow({
  plan,
  subscriberCount,
  periodLabel,
  formattedAmount,
}: {
  plan: Plan;
  subscriberCount: number;
  periodLabel: string;
  formattedAmount: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{plan.name}</span>
          <Badge variant="secondary">{periodLabel}</Badge>
          {plan.status === "inactive" && (
            <Badge variant="outline">Inactive</Badge>
          )}
          {!plan.is_public && <Badge variant="outline">Internal</Badge>}
          {plan.safepay_plan_id && (
            <Badge variant="outline" title={plan.safepay_plan_id}>
              Safepay linked
            </Badge>
          )}
        </div>
        {plan.description && (
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {plan.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold">{formattedAmount}</p>
          <p className="text-xs text-muted-foreground">
            {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <PlanFormDialog serviceId={plan.service_id} plan={plan} />
          <DeleteConfirmButton
            title={`Delete the ${plan.name} plan?`}
            description={
              subscriberCount > 0
                ? `${subscriberCount} subscription${subscriberCount === 1 ? "" : "s"} reference this plan. They will keep their current price but lose the plan link.`
                : "This plan will be removed from your catalogue and from any website pricing pages."
            }
            onDelete={() => deletePlanRecord(plan.id)}
          />
        </div>
      </div>
    </div>
  );
}
