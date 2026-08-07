import { Text } from "@react-email/components";

export const buttonStyle = {
  display: "inline-block",
  backgroundColor: "#111827",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  marginTop: "16px",
};

export const footerTextStyle = {
  color: "#6b7280",
  fontSize: "12px",
};

export function InvoiceLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Text style={{ margin: "4px 0" }}>
      <strong>{label}:</strong> {value}
    </Text>
  );
}
