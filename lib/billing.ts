import { addMonths, addYears, format } from "date-fns";
import type { SubscriptionFrequency } from "@/types/database";

export const DATE_FORMAT = "yyyy-MM-dd";

/**
 * Moves a `yyyy-MM-dd` due date on by one billing period.
 *
 * The date is built from its parts rather than parsed from a string, because
 * `new Date("2026-09-10T00:00:00Z")` is UTC midnight while date-fns `addMonths`
 * and `format` both work in local time. West of UTC that lands on the previous
 * day, so every cycle would drag the due date one day earlier. Local midnight
 * in, local midnight out, no drift.
 */
export function advanceDueDate(
  dueDate: string,
  frequency: SubscriptionFrequency,
): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  const next =
    frequency === "yearly"
      ? addYears(parsed, 1)
      : addMonths(parsed, frequency === "quarterly" ? 3 : 1);

  return format(next, DATE_FORMAT);
}
