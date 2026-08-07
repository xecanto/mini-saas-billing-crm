import { InvoiceRequestEmail } from "./invoice-request";
import type { InvoiceEmailProps } from "./new-invoice";

export function OverdueEmail(props: InvoiceEmailProps) {
  return (
    <InvoiceRequestEmail
      {...props}
      preview={`Overdue: ${props.amount} for ${props.invoiceNumber}`}
      heading="Payment overdue"
      headingTone="warning"
      intro={`This invoice was due on ${props.dueDate} and is still outstanding. Please settle it at your earliest convenience to avoid any interruption to your service.`}
      footerNote="Already paid? Let us know and we will update our records."
    />
  );
}
