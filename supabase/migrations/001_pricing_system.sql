-- Pricing system: variant cache, quotes, order snapshots (see Printful_Pricing_GoldenGooseTees.md)
-- Run in Supabase SQL Editor or via CLI.

-- Cache of Printful variant base prices for fast catalog rendering
create table if not exists printful_variant_price_cache (
  variant_id bigint primary key,
  product_id bigint null,
  currency text not null default 'USD',
  printful_base_price numeric(10,2) not null,
  availability_status text null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_printful_variant_price_cache_product
  on printful_variant_price_cache(product_id);

-- Ephemeral quotes (authoritative totals at time of checkout)
create table if not exists pricing_quotes (
  id uuid primary key,
  pricing_version text not null,
  currency text not null default 'USD',
  design_id uuid null,
  variant_id bigint not null,
  configuration_id text null,
  quantity int not null default 1,
  shipping_method text not null default 'STANDARD',
  recipient jsonb not null,
  quote_input_hash text not null,

  printful_estimate jsonb not null,
  printful_total_cost numeric(10,2) not null,

  retail_total_amount numeric(10,2) not null,
  stripe_fee_est_amount numeric(10,2) not null,
  refund_buffer_est_amount numeric(10,2) not null,
  profit_target_amount numeric(10,2) not null,
  profit_est_amount numeric(10,2) not null,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_pricing_quotes_expires_at
  on pricing_quotes(expires_at);

create index if not exists idx_pricing_quotes_design_id
  on pricing_quotes(design_id);

-- Orders: add pricing snapshot fields (idempotent)
alter table orders
  add column if not exists pricing_quote_id uuid null references pricing_quotes(id),
  add column if not exists pricing_version text null,
  add column if not exists currency text null default 'USD',
  add column if not exists pricing_snapshot jsonb null,
  add column if not exists printful_estimate jsonb null,
  add column if not exists printful_total_cost numeric(10,2) null,
  add column if not exists stripe_fee_est_amount numeric(10,2) null,
  add column if not exists refund_buffer_est_amount numeric(10,2) null,
  add column if not exists profit_target_amount numeric(10,2) null,
  add column if not exists profit_est_amount numeric(10,2) null;

-- RLS: no direct anon access; server uses service role (bypasses RLS).
alter table printful_variant_price_cache enable row level security;
alter table pricing_quotes enable row level security;

-- Optional: allow authenticated read of own quotes (not required if only server reads)
-- Service role inserts quotes/orders; keep locked down by default.

comment on table pricing_quotes is 'Server-written checkout quotes; do not expose insert to anon clients.';
comment on table printful_variant_price_cache is 'Cron-refreshed Printful catalog variant base prices for display.';
