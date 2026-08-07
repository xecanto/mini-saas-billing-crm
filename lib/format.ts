import { format, parseISO } from "date-fns";

export function formatCurrency(amount: number, currency = "PKR"): string {
  const rounded = Math.round(amount).toLocaleString("en-PK");
  if (currency === "PKR") {
    return `Rs. ${rounded}`;
  }
  return `${currency} ${rounded}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return format(parseISO(date), "d MMM yyyy");
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  return format(parseISO(date), "d MMM yyyy, h:mm a");
}
