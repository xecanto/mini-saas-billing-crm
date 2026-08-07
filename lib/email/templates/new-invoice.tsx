import { InvoiceRequestEmail } from "./invoice-request";

export type InvoiceEmailProps = {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  payUrl: string;
  serviceName?: string;
  note?: string;
};

export function NewInvoiceEmail(props: InvoiceEmailProps) {
  return (
    <InvoiceRequestEmail
      {...props}
      preview={`New invoice ${props.invoiceNumber} for ${props.amount}, due ${props.dueDate}`}
      heading="New invoice"
      headingTone="accent"
      intro="A new invoice has been raised for your subscription. You can pay it online in a couple of taps."
      footerNote="If you have already paid, please disregard this email."
    />
  );
}

/** Sent by hand from the dashboard when you want to nudge a specific invoice. */
export function PaymentRequestEmail(props: InvoiceEmailProps) {
  return (
    <InvoiceRequestEmail
      {...props}
      preview={`Payment request: ${props.amount} for ${props.invoiceNumber}`}
      heading="Payment request"
      headingTone="accent"
      intro="Here is the payment link for the work below. Tap the button and you can pay by card, JazzCash or Easypaisa."
      footerNote="Questions about this invoice? Just reply to this email."
    />
  );
}
