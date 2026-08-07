import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "./layout";
import { InvoiceLine } from "./shared";

export function ReceiptEmail({
  clientName,
  invoiceNumber,
  amount,
  paidAt,
  gateway,
}: {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  paidAt: string;
  gateway: string;
}) {
  return (
    <EmailLayout preview={`Payment received for invoice ${invoiceNumber}`}>
      <Heading as="h2">Payment received</Heading>
      <Text>Dear {clientName},</Text>
      <Text>Thank you! We&apos;ve recorded your payment.</Text>
      <InvoiceLine label="Invoice" value={invoiceNumber} />
      <InvoiceLine label="Amount paid" value={amount} />
      <InvoiceLine label="Payment method" value={gateway} />
      <InvoiceLine label="Date" value={paidAt} />
    </EmailLayout>
  );
}
