export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getInvoicePayUrl(invoiceId: string): string {
  return `${getAppUrl()}/pay/${invoiceId}`;
}

// Client-facing page for viewing and cancelling a recurring subscription. The
// subscription's UUID is the capability - unguessable, same approach as the
// public invoice link.
export function getManageSubscriptionUrl(subscriptionId: string): string {
  return `${getAppUrl()}/manage/${subscriptionId}`;
}
