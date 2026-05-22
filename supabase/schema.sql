-- StockSage schema

create table if not exists daily_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  screened_count integer,
  finalist_count integer,
  error text,
  created_at timestamptz not null default now()
);

create unique index if not exists daily_runs_run_date_idx on daily_runs (run_date);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references daily_runs (id) on delete cascade,
  run_date date not null,
  rank integer not null,
  ticker text not null,
  company_name text not null,
  sector text,
  signal text not null check (signal in ('Buy Now', 'Watch')),
  thesis text not null,
  risk_score text not null check (risk_score in ('Low', 'Medium', 'High')),
  risk_rationale text,
  pe_ratio numeric,
  revenue_growth_yoy numeric,
  market_cap numeric,
  price numeric,
  price_change_3m numeric,
  catalyst text,
  created_at timestamptz not null default now()
);

create index if not exists recommendations_run_date_idx on recommendations (run_date);
create index if not exists recommendations_ticker_idx on recommendations (ticker);

create table if not exists user_prefs (
  id text primary key default 'singleton',
  risk_tolerance text not null default 'moderate' check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
  last_manual_refresh timestamptz
);

-- Seed default prefs row
insert into user_prefs (id, risk_tolerance) values ('singleton', 'moderate')
  on conflict (id) do nothing;

-- Enable row-level security (service role bypasses RLS)
alter table daily_runs enable row level security;
alter table recommendations enable row level security;
alter table user_prefs enable row level security;
