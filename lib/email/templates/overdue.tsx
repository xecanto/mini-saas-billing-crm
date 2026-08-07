import { Heading, Hr, Text, Link } from "@react-email/components";
import { EmailLayout } from "./layout";
import { InvoiceLine, buttonStyle, footerTextStyle } from "./shared";

export function OverdueEmail({
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
    <EmailLayout preview={`Overdue: invoice ${invoiceNumber} for ${amount}`}>
      <Heading as="h2">Invoice overdue</Heading>
      <Text>Dear {clientName},</Text>
      <Text>
        Our records show the invoice below is now overdue. Please arrange
        payment at your earliest convenience.
      </Text>
      <InvoiceLine label="Invoice" value={invoiceNumber} />
      <InvoiceLine label="Amount" value={amount} />
      <InvoiceLine label="Was due" value={dueDate} />
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
