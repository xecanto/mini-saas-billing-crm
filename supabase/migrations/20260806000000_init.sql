-- Mini SaaS Billing CRM - initial schema
-- Run this in the Supabase SQL Editor (or via `supabase db push` if you link the CLI).

create extension if not exists pgcrypto;

-- =========================================================
-- clients
-- =========================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  company text,
  service_type text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- subscriptions
-- =========================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'PKR',
  frequency text not null check (frequency in ('monthly', 'quarterly', 'yearly')),
  next_due_date date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_client_id_idx on public.subscriptions (client_id);
create index if not exists subscriptions_next_due_date_idx on public.subscriptions (next_due_date) where status = 'active';

-- =========================================================
-- invoices
-- =========================================================
create sequence if not exists public.invoice_number_seq start 1001;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default ('INV-' || nextval('public.invoice_number_seq')::text),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  client_id uuid not null references public.clients (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  invoice_date date not null default current_date,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists invoices_subscription_id_idx on public.invoices (subscription_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_due_date_idx on public.invoices (due_date);

-- =========================================================
-- payments
-- =========================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  gateway text not null default 'manual' check (gateway in ('cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'card', 'manual', 'other')),
  transaction_id text,
  amount numeric(12, 2) not null check (amount >= 0),
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payments_invoice_id_idx on public.payments (invoice_id);

-- =========================================================
-- reminders
-- =========================================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists reminders_invoice_id_idx on public.reminders (invoice_id);

-- =========================================================
-- Row Level Security
-- Single-admin model for V1: any authenticated user has full access.
-- The Netlify scheduled function uses the service_role key, which bypasses RLS entirely.
-- =========================================================
alter table public.clients enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.reminders enable row level security;

create policy "authenticated full access" on public.clients
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.subscriptions
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.invoices
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.payments
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.reminders
  for all to authenticated using (true) with check (true);
