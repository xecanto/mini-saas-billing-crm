import { Heading, Hr, Text, Link } from "@react-email/components";
import { EmailLayout } from "./layout";
import { InvoiceLine, buttonStyle, footerTextStyle } from "./shared";

export function NewInvoiceEmail({
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  payUrl,
}: {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  payUrl: string;
}) {
  return (
    <EmailLayout
      preview={`New invoice ${invoiceNumber} for ${amount}, due ${dueDate}`}
    >
      <Heading as="h2">New invoice</Heading>
      <Text>Dear {clientName},</Text>
      <Text>A new invoice has been generated for your subscription.</Text>
      <InvoiceLine label="Invoice" value={invoiceNumber} />
      <InvoiceLine label="Amount" value={amount} />
      <InvoiceLine label="Due date" value={dueDate} />
      <Link href={payUrl} style={buttonStyle}>
        View invoice
      </Link>
      <Hr />
      <Text style={footerTextStyle}>
        If you have already paid, please disregard this email.
      </Text>
    </EmailLayout>
  );
}
