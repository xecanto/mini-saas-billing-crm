export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getInvoicePayUrl(invoiceId: string): string {
  return `${getAppUrl()}/pay/${invoiceId}`;
}
