-- Safepay integration: hosted checkout for one-off invoices, plus optional
-- card-on-file auto-billing for subscriptions.

-- =========================================================
-- payments: allow Safepay as a gateway
-- =========================================================
alter table public.payments
  drop constraint if exists payments_gateway_check;

alter table public.payments
  add constraint payments_gateway_check check (
    gateway in (
      'cash', 'bank_transfer', 'jazzcash', 'easypaisa',
      'card', 'manual', 'other', 'safepay'
    )
  );

-- =========================================================
-- invoices: link to the Safepay tracker that paid them
-- =========================================================
alter table public.invoices
  add column if not exists safepay_tracker text;

-- One tracker settles at most one invoice. Partial so the many unpaid
-- invoices with a null tracker don't collide.
create unique index if not exists invoices_safepay_tracker_idx
  on public.invoices (safepay_tracker)
  where safepay_tracker is not null;

-- =========================================================
-- subscriptions: optional Safepay auto-billing
--
-- auto_billing off (default) keeps the existing behaviour exactly: the daily
-- function generates an invoice and the client pays it manually. Turned on,
-- Safepay charges the saved card on its own schedule and the daily function
-- leaves the subscription alone - invoices are then created already-paid from
-- the subscription.payment_succeeded webhook.
-- =========================================================
alter table public.subscriptions
  add column if not exists auto_billing boolean not null default false,
  add column if not exists safepay_plan_id text,
  add column if not exists safepay_subscription_id text,
  add column if not exists safepay_status text;

create unique index if not exists subscriptions_safepay_subscription_idx
  on public.subscriptions (safepay_subscription_id)
  where safepay_subscription_id is not null;

-- =========================================================
-- webhook_events: idempotency ledger
--
-- Safepay retries webhooks, and a retry must not charge, email or invoice
-- twice. The primary key is the natural dedupe key, so a replayed delivery
-- loses the insert race and is skipped.
-- =========================================================
create table if not exists public.webhook_events (
  id text primary key,
  source text not null default 'safepay',
  event_type text,
  payload jsonb,
  processed_at timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

create policy "authenticated full access" on public.webhook_events
  for all to authenticated using (true) with check (true);
