import { Heading, Hr, Text, Link } from "@react-email/components";
import { EmailLayout } from "./layout";
import { InvoiceLine, buttonStyle, footerTextStyle } from "./shared";

export function DueSoonEmail({
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
      preview={`Reminder: invoice ${invoiceNumber} is due ${dueDate}`}
    >
      <Heading as="h2">Payment reminder</Heading>
      <Text>Dear {clientName},</Text>
      <Text>This is a friendly reminder that your invoice is due soon.</Text>
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
