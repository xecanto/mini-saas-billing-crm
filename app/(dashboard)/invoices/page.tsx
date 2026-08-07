import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { InvoicesTable } from "./invoices-table";
import type { InvoiceStatus } from "@/types/database";

const TABS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = (TABS.find((t) => t.value === status) ?? TABS[0]).value;

  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("*, clients(id, name)")
    .order("due_date", { ascending: true });

  if (activeTab !== "all") {
    query = query.eq("status", activeTab);
  }

  const { data: invoices } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Track what&apos;s owed, overdue, and paid.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/invoices/new">
            <Plus className="size-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            asChild
            variant={activeTab === tab.value ? "secondary" : "ghost"}
            size="sm"
          >
            <Link
              href={
                tab.value === "all" ? "/invoices" : `/invoices?status=${tab.value}`
              }
            >
              {tab.label}
            </Link>
          </Button>
        ))}
      </div>

      <InvoicesTable invoices={invoices ?? []} />
    </div>
  );
}
