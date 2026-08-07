export type ClientStatus = "active" | "inactive";
export type SubscriptionFrequency = "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus = "active" | "paused" | "cancelled";
export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";
export type PaymentGateway =
  | "cash"
  | "bank_transfer"
  | "jazzcash"
  | "easypaisa"
  | "card"
  | "manual"
  | "other";
export type ReminderChannel = "email" | "whatsapp";
export type ReminderStatus = "pending" | "sent" | "failed";

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  service_type: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
};

export type Subscription = {
  id: string;
  client_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  next_due_date: string;
  status: SubscriptionStatus;
  created_at: string;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  subscription_id: string | null;
  client_id: string;
  amount: number;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  notes: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  invoice_id: string;
  gateway: PaymentGateway;
  transaction_id: string | null;
  amount: number;
  paid_at: string;
  notes: string | null;
  created_at: string;
};

export type Reminder = {
  id: string;
  invoice_id: string;
  channel: ReminderChannel;
  sent_at: string | null;
  status: ReminderStatus;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: Partial<Omit<Client, "id" | "created_at">> &
          Pick<Client, "name" | "phone">;
        Update: Partial<Omit<Client, "id" | "created_at">>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Omit<Subscription, "id" | "created_at">> &
          Pick<
            Subscription,
            "client_id" | "name" | "amount" | "frequency" | "next_due_date"
          >;
        Update: Partial<Omit<Subscription, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: Invoice;
        Insert: Partial<
          Omit<Invoice, "id" | "created_at" | "invoice_number">
        > &
          Pick<Invoice, "client_id" | "amount" | "due_date">;
        Update: Partial<Omit<Invoice, "id" | "created_at" | "invoice_number">>;
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Omit<Payment, "id" | "created_at">> &
          Pick<Payment, "invoice_id" | "amount">;
        Update: Partial<Omit<Payment, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: Reminder;
        Insert: Partial<Omit<Reminder, "id" | "created_at">> &
          Pick<Reminder, "invoice_id" | "channel">;
        Update: Partial<Omit<Reminder, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "reminders_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
