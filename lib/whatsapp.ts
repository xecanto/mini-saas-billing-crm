// Normalizes common Pakistani phone number formats to E.164 digits (no "+"),
// which is what wa.me links expect. Examples handled: "0300-1234567",
// "03001234567", "+92 300 1234567", "92 300 1234567".
export function normalizePakistaniPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");

  if (digits.startsWith("0092")) return digits.slice(2);
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const normalized = normalizePakistaniPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildInvoiceReminderMessage(input: {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  payUrl: string;
}): string {
  return [
    `Assalam o Alaikum ${input.clientName},`,
    "",
    `Your payment of ${input.amount} is due on ${input.dueDate}.`,
    "",
    `Invoice: ${input.invoiceNumber}`,
    "",
    `View invoice: ${input.payUrl}`,
  ].join("\n");
}
