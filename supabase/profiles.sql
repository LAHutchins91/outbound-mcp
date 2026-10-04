-- Billing profile for Outbound accounts.
-- Sendable wording is not stored here. It lives in ~/.outbound/outbound.json.
-- This schema is not a story bible and it is not another product's database.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'none',
  subscription_status text not null default 'none',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own outbound profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);
