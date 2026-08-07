import { Section, Text } from "@react-email/components";
import { EmailLayout, brand } from "./layout";
import { AmountBlock, DetailRow, paragraphStyle } from "./shared";

export function PriceChangeEmail({
  clientName,
  planName,
  oldAmount,
  newAmount,
  manageUrl,
  effectiveFrom,
}: {
  clientName: string;
  planName: string;
  oldAmount: string;
  newAmount: string;
  manageUrl: string;
  effectiveFrom?: string;
}) {
  return (
    <EmailLayout
      preview={`Your ${planName} price is changing to ${newAmount}`}
      heading="A change to your subscription"
      headingTone="warning"
      footerNote="You can cancel at any time using the link above — no notice period."
    >
      <Text style={paragraphStyle}>Assalam o Alaikum {clientName},</Text>
      <Text style={paragraphStyle}>
        We are writing to let you know that the price of your{" "}
        <strong>{planName}</strong> subscription is changing
        {effectiveFrom ? ` from ${effectiveFrom}` : ""}.
      </Text>

      <AmountBlock amount={newAmount} caption="New price" />

      <Section style={{ margin: "0 0 24px" }}>
        <DetailRow label="Plan" value={planName} />
        <DetailRow label="Previous price" value={oldAmount} />
        <DetailRow label="New price" value={newAmount} />
      </Section>

      <Text style={paragraphStyle}>
        You do not need to do anything — your existing payment method continues
        to work. If you would rather not continue, you can cancel here:
      </Text>

      <Text
        style={{
          color: brand.accent,
          fontSize: "13px",
          wordBreak: "break-all" as const,
          margin: 0,
        }}
      >
        {manageUrl}
      </Text>
    </EmailLayout>
  );
}
