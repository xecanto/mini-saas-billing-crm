import { Button, Column, Row, Section, Text } from "@react-email/components";
import { brand, fontStack } from "./layout";

export const buttonStyle = {
  display: "inline-block",
  backgroundColor: brand.accent,
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  fontFamily: fontStack,
};

export const footerTextStyle = {
  color: brand.muted,
  fontSize: "12px",
  lineHeight: "18px",
};

export const paragraphStyle = {
  color: brand.ink,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

/** The number the whole email exists to communicate. */
export function AmountBlock({
  amount,
  caption,
}: {
  amount: string;
  caption?: string;
}) {
  return (
    <Section
      style={{
        backgroundColor: brand.canvas,
        borderRadius: "10px",
        padding: "20px 24px",
        margin: "0 0 20px",
        textAlign: "center" as const,
      }}
    >
      <Text
        style={{
          color: brand.ink,
          fontSize: "32px",
          fontWeight: 700,
          margin: 0,
          lineHeight: "40px",
        }}
      >
        {amount}
      </Text>
      {caption && (
        <Text style={{ color: brand.muted, fontSize: "13px", margin: "4px 0 0" }}>
          {caption}
        </Text>
      )}
    </Section>
  );
}

/** Label/value pair. Two columns on desktop, stacked by the client on mobile. */
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ borderBottom: `1px solid ${brand.line}` }}>
      <Column style={{ padding: "10px 0" }}>
        <Text style={{ color: brand.muted, fontSize: "13px", margin: 0 }}>
          {label}
        </Text>
      </Column>
      <Column style={{ padding: "10px 0", textAlign: "right" as const }}>
        <Text
          style={{ color: brand.ink, fontSize: "14px", fontWeight: 600, margin: 0 }}
        >
          {value}
        </Text>
      </Column>
    </Row>
  );
}

export function CallToAction({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ textAlign: "center" as const, padding: "8px 0 4px" }}>
      <Button href={href} style={buttonStyle}>
        {label}
      </Button>
      <Text style={{ ...footerTextStyle, margin: "14px 0 0" }}>
        Or copy this link into your browser:
        <br />
        <span style={{ color: brand.accent, wordBreak: "break-all" as const }}>
          {href}
        </span>
      </Text>
    </Section>
  );
}

// Kept so existing templates importing it keep compiling.
export function InvoiceLine({ label, value }: { label: string; value: string }) {
  return <DetailRow label={label} value={value} />;
}
