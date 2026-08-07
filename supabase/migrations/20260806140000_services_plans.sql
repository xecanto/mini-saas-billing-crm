-- Services and plans: a catalogue of what you sell, so subscriptions stop being
-- ad-hoc names and amounts and you can answer "who is on which plan".
--
-- Also adds API keys, which let your other websites read the catalogue and
-- start self-serve checkouts against this CRM.

-- =========================================================
-- services - a product line (POS, CMS, Hosting, Support)
-- =========================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  -- Which of your sites sells this, so the dashboard can group by property.
  website_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================
-- plans - a priced tier of a service
--
-- One row per (service, tier, billing period): "POS / Pro / monthly" and
-- "POS / Pro / yearly" are two plans, each with its own amount you enter by
-- hand. one_time covers setup fees and one-off work.
-- =========================================================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name text not null,
  billing_period text not null check (
    billing_period in ('monthly', 'quarterly', 'yearly', 'one_time')
  ),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'PKR',
  description text,
  -- Bullet points for pricing pages rendered by your other sites.
  features text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  -- Whether the public API may expose this plan to other websites.
  is_public boolean not null default true,
  sort_order integer not null default 0,
  -- Created lazily the first time somebody subscribes with auto-billing.
  safepay_plan_id text,
  created_at timestamptz not null default now(),
  unique (service_id, name, billing_period)
);

create index if not exists plans_service_id_idx on public.plans (service_id);

-- =========================================================
-- subscriptions -> plans
--
-- plan_id is nullable: subscriptions created before this migration, and genuine
-- one-off custom arrangements, have no plan. price_overridden marks a client
-- who is on a plan but at a negotiated amount, so a plan price change can leave
-- them alone.
-- =========================================================
alter table public.subscriptions
  add column if not exists plan_id uuid references public.plans (id) on delete set null,
  add column if not exists price_overridden boolean not null default false;

create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);

-- One-time purchases are invoices with no subscription, so record the plan here
-- too or there is no way to report on what was actually sold.
alter table public.invoices
  add column if not exists plan_id uuid references public.plans (id) on delete set null;

create index if not exists invoices_plan_id_idx on public.invoices (plan_id);

-- =========================================================
-- api_keys - one per website that talks to this CRM
--
-- Only the SHA-256 hash is stored; the plaintext key is shown once at creation
-- and is unrecoverable afterwards. key_prefix exists purely so the dashboard can
-- show which key is which.
-- =========================================================
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{read,checkout}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.services enable row level security;
alter table public.plans enable row level security;
alter table public.api_keys enable row level security;

create policy "authenticated full access" on public.services
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.plans
  for all to authenticated using (true) with check (true);

-- No anon policy at all: key hashes are only ever read by the service-role
-- client inside the API routes.
create policy "authenticated full access" on public.api_keys
  for all to authenticated using (true) with check (true);
