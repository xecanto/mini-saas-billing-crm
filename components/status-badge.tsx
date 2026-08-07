import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  sent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  overdue: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  inactive: "bg-muted text-muted-foreground border-transparent",
  cancelled: "bg-muted text-muted-foreground border-transparent",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", STATUS_STYLES[status])}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}
