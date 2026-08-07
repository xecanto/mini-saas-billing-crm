import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Everything here is inline styles on table-friendly primitives, because that
// is all that survives Outlook and Gmail. No <style> block, no keyframes: CSS
// animation is unsupported in Gmail, Outlook and Yahoo, so anything relying on
// it would simply not render for most recipients.
export const brand = {
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  accent: "#0f766e",
  accentDark: "#115e59",
  surface: "#ffffff",
  canvas: "#f1f5f9",
  positive: "#047857",
  warning: "#b45309",
};

export const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function EmailLayout({
  preview,
  heading,
  headingTone = "accent",
  children,
  footerNote,
}: {
  preview: string;
  heading: string;
  headingTone?: "accent" | "positive" | "warning";
  children: React.ReactNode;
  footerNote?: string;
}) {
  const toneColor =
    headingTone === "positive"
      ? brand.positive
      : headingTone === "warning"
        ? brand.warning
        : brand.accent;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: brand.canvas,
          fontFamily: fontStack,
          margin: 0,
          padding: "24px 12px",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <Container
          style={{
            backgroundColor: brand.surface,
            borderRadius: "12px",
            maxWidth: "520px",
            overflow: "hidden",
            border: `1px solid ${brand.line}`,
          }}
        >
          {/* Solid colour, not a gradient: Outlook renders gradients as nothing. */}
          <Section
            style={{
              backgroundColor: toneColor,
              padding: "28px 32px",
            }}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: 700,
                margin: 0,
                lineHeight: "28px",
              }}
            >
              {heading}
            </Text>
          </Section>

          <Section style={{ padding: "28px 32px" }}>{children}</Section>

          <Hr style={{ borderColor: brand.line, margin: 0 }} />

          <Section style={{ padding: "18px 32px" }}>
            <Text
              style={{ color: brand.muted, fontSize: "12px", margin: 0, lineHeight: "18px" }}
            >
              {footerNote ??
                "This is an automated message from your billing account."}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
