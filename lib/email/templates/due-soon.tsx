import { InvoiceRequestEmail } from "./invoice-request";
import type { InvoiceEmailProps } from "./new-invoice";

export function DueSoonEmail(props: InvoiceEmailProps) {
  return (
    <InvoiceRequestEmail
      {...props}
      preview={`Reminder: ${props.amount} due ${props.dueDate}`}
      heading="Payment reminder"
      headingTone="accent"
      intro={`A friendly reminder that your payment is due on ${props.dueDate}.`}
      footerNote="If you have already paid, please disregard this email."
    />
  );
}
