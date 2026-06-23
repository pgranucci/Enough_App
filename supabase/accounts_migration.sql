-- Multi-account savings snapshot on retirement_plans (Profile → Accounts and Savings)
alter table public.retirement_plans
  add column if not exists accounts_snapshot jsonb not null default '[]'::jsonb;
