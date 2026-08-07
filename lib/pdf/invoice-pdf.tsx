import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice, Client, Payment } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  title: { fontSize: 20, fontWeight: 700 },
  muted: { color: "#6b7280" },
  section: { marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#6b7280" },
  table: { marginTop: 12, borderTop: "1 solid #e5e7eb" },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 8,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    fontWeight: 700,
    backgroundColor: "#f9fafb",
  },
  col: { flex: 1 },
  colRight: { flex: 1, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1 solid #111827",
  },
  statusBadge: {
    fontSize: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: "#f3f4f6",
    textTransform: "uppercase",
  },
});

export function InvoicePdf({
  invoice,
  client,
  payments,
}: {
  invoice: Invoice;
  client: Client | null;
  payments: Payment[];
}) {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.muted}>{invoice.invoice_number}</Text>
          </View>
          <View>
            <Text style={styles.statusBadge}>{invoice.status}</Text>
          </View>
        </View>

        <View style={[styles.section, { flexDirection: "row", justifyContent: "space-between" }]}>
          <View>
            <Text style={styles.label}>Billed to</Text>
            <Text>{client?.name ?? "—"}</Text>
            {client?.company && <Text>{client.company}</Text>}
            {client?.email && <Text style={styles.muted}>{client.email}</Text>}
            <Text style={styles.muted}>{client?.phone}</Text>
          </View>
          <View>
            <View style={styles.row}>
              <Text style={[styles.label, { marginRight: 16 }]}>Invoice date</Text>
              <Text>{formatDate(invoice.invoice_date)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { marginRight: 16 }]}>Due date</Text>
              <Text>{formatDate(invoice.due_date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col}>Description</Text>
            <Text style={styles.colRight}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col}>
              {invoice.notes || "Subscription / service charge"}
            </Text>
            <Text style={styles.colRight}>{formatCurrency(invoice.amount)}</Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={{ fontWeight: 700 }}>
            Total: {formatCurrency(invoice.amount)}
          </Text>
        </View>

        {payments.length > 0 && (
          <View style={[styles.section, { marginTop: 32 }]}>
            <Text style={{ fontWeight: 700, marginBottom: 8 }}>
              Payments received
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col}>Date</Text>
                <Text style={styles.col}>Method</Text>
                <Text style={styles.colRight}>Amount</Text>
              </View>
              {payments.map((payment) => (
                <View style={styles.tableRow} key={payment.id}>
                  <Text style={styles.col}>{formatDate(payment.paid_at)}</Text>
                  <Text style={styles.col}>{payment.gateway}</Text>
                  <Text style={styles.colRight}>
                    {formatCurrency(payment.amount)}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.totalRow}>
              <Text>Total paid: {formatCurrency(totalPaid)}</Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
