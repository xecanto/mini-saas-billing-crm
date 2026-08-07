import { Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";
import { DetailRow, paragraphStyle } from "./shared";

export function SubscriptionCancelledEmail({
  clientName,
  planName,
  lastBillingDate,
}: {
  clientName: string;
  planName: string;
  lastBillingDate?: string;
}) {
  return (
    <EmailLayout
      preview={`Your ${planName} subscription has been cancelled`}
      heading="Subscription cancelled"
      headingTone="warning"
      footerNote="Changed your mind? Reply to this email and we will set you back up."
    >
      <Text style={paragraphStyle}>Assalam o Alaikum {clientName},</Text>
      <Text style={paragraphStyle}>
        Your <strong>{planName}</strong> subscription has been cancelled and you
        will not be charged again. No further action is needed.
      </Text>

      <Section style={{ margin: "0 0 8px" }}>
        <DetailRow label="Plan" value={planName} />
        <DetailRow label="Status" value="Cancelled" />
        {lastBillingDate && (
          <DetailRow label="Active until" value={lastBillingDate} />
        )}
      </Section>

      <Text style={paragraphStyle}>
        Thank you for your business — it has been a pleasure working with you.
      </Text>
    </EmailLayout>
  );
}
