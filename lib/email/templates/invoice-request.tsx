import { Section, Text } from "@react-email/components";
import { EmailLayout, brand } from "./layout";
import { AmountBlock, CallToAction, DetailRow, paragraphStyle } from "./shared";

/**
 * The one invoice email, in four tones.
 *
 * "New invoice", "due soon", "overdue" and a manually sent payment request all
 * show the same facts and want the same click, so they share a body and differ
 * only in heading, colour and the line of copy above the amount.
 */
export function InvoiceRequestEmail({
  preview,
  heading,
  headingTone,
  intro,
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  payUrl,
  serviceName,
  note,
  footerNote,
}: {
  preview: string;
  heading: string;
  headingTone?: "accent" | "positive" | "warning";
  intro: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  payUrl: string;
  serviceName?: string;
  note?: string;
  footerNote?: string;
}) {
  return (
    <EmailLayout
      preview={preview}
      heading={heading}
      headingTone={headingTone}
      footerNote={footerNote}
    >
      <Text style={paragraphStyle}>Assalam o Alaikum {clientName},</Text>
      <Text style={paragraphStyle}>{intro}</Text>

      <AmountBlock amount={amount} caption={`Due ${dueDate}`} />

      <Section style={{ margin: "0 0 24px" }}>
        <DetailRow label="Invoice" value={invoiceNumber} />
        {serviceName && <DetailRow label="Service" value={serviceName} />}
        <DetailRow label="Amount" value={amount} />
        <DetailRow label="Due date" value={dueDate} />
      </Section>

      {note && (
        <Text
          style={{
            ...paragraphStyle,
            backgroundColor: brand.canvas,
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "14px",
          }}
        >
          {note}
        </Text>
      )}

      <CallToAction href={payUrl} label={`Pay ${amount}`} />

      <Text
        style={{
          color: brand.muted,
          fontSize: "13px",
          lineHeight: "20px",
          margin: "20px 0 0",
          textAlign: "center" as const,
        }}
      >
        Card, JazzCash and Easypaisa accepted. Prefer bank transfer? Reply to
        this email quoting {invoiceNumber}.
      </Text>
    </EmailLayout>
  );
}
