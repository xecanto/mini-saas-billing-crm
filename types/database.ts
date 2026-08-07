export type ClientStatus = "active" | "inactive";
export type SubscriptionFrequency = "monthly" | "quarterly" | "yearly";
export type ServiceStatus = "active" | "inactive";
export type BillingPeriod = SubscriptionFrequency | "one_time";
export type SubscriptionStatus = "active" | "paused" | "cancelled";
export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";
export type PaymentGateway =
  | "cash"
  | "bank_transfer"
  | "jazzcash"
  | "easypaisa"
  | "card"
  | "manual"
  | "other"
  | "safepay";
export type ReminderChannel = "email" | "whatsapp";
export type ReminderStatus = "pending" | "sent" | "failed";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  status: ServiceStatus;
  sort_order: number;
  created_at: string;
};

export type Plan = {
  id: string;
  service_id: string;
  name: string;
  billing_period: BillingPeriod;
  amount: number;
  currency: string;
  description: string | null;
  features: string[];
  status: ServiceStatus;
  is_public: boolean;
  sort_order: number;
  safepay_plan_id: string | null;
  created_at: string;
};

export type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

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
  // Safepay auto-billing. Off by default: the daily function keeps generating
  // invoices for the client to pay manually.
  auto_billing: boolean;
  safepay_plan_id: string | null;
  safepay_subscription_id: string | null;
  safepay_status: string | null;
  // Catalogue link. Null for bespoke arrangements and pre-catalogue rows.
  plan_id: string | null;
  // Set when this client pays something other than the plan's list price, so a
  // plan-wide price change can skip them.
  price_overridden: boolean;
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
  safepay_tracker: string | null;
  // Set for one-time purchases so they show up in per-plan reporting.
  plan_id: string | null;
};

export type WebhookEvent = {
  id: string;
  source: string;
  event_type: string | null;
  payload: unknown;
  processed_at: string;
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
      services: {
        Row: Service;
        Insert: Partial<Omit<Service, "id" | "created_at">> &
          Pick<Service, "name">;
        Update: Partial<Omit<Service, "id" | "created_at">>;
        Relationships: [];
      };
      plans: {
        Row: Plan;
        Insert: Partial<Omit<Plan, "id" | "created_at">> &
          Pick<Plan, "service_id" | "name" | "billing_period" | "amount">;
        Update: Partial<Omit<Plan, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "plans_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      api_keys: {
        Row: ApiKey;
        Insert: Partial<Omit<ApiKey, "id" | "created_at">> &
          Pick<ApiKey, "name" | "key_prefix" | "key_hash">;
        Update: Partial<Omit<ApiKey, "id" | "created_at">>;
        Relationships: [];
      };
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
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
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
          {
            foreignKeyName: "invoices_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
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
      webhook_events: {
        Row: WebhookEvent;
        Insert: Partial<Omit<WebhookEvent, "id" | "processed_at">> &
          Pick<WebhookEvent, "id">;
        Update: Partial<Omit<WebhookEvent, "id" | "processed_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
