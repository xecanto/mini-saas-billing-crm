import { Section, Text } from "@react-email/components";
import { EmailLayout, brand } from "./layout";
import { AmountBlock, DetailRow, paragraphStyle } from "./shared";

export function ReceiptEmail({
  clientName,
  invoiceNumber,
  amount,
  paidAt,
  gateway,
  manageUrl,
}: {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  paidAt: string;
  gateway: string;
  manageUrl?: string;
}) {
  return (
    <EmailLayout
      preview={`Payment received for invoice ${invoiceNumber}`}
      heading="Payment received"
      headingTone="positive"
      footerNote="Keep this email as your receipt."
    >
      <Text style={paragraphStyle}>Assalam o Alaikum {clientName},</Text>
      <Text style={paragraphStyle}>
        Thank you — your payment has been received and your account is up to
        date.
      </Text>

      <AmountBlock amount={amount} caption={`Paid ${paidAt}`} />

      <Section style={{ margin: "0 0 8px" }}>
        <DetailRow label="Invoice" value={invoiceNumber} />
        <DetailRow label="Amount paid" value={amount} />
        <DetailRow label="Payment method" value={gateway} />
        <DetailRow label="Date" value={paidAt} />
      </Section>

      {manageUrl && (
        <Text
          style={{
            color: brand.muted,
            fontSize: "13px",
            lineHeight: "20px",
            margin: "20px 0 0",
          }}
        >
          Manage or cancel this subscription any time at{" "}
          <span style={{ color: brand.accent, wordBreak: "break-all" as const }}>
            {manageUrl}
          </span>
        </Text>
      )}
    </EmailLayout>
  );
}
