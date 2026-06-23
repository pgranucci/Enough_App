-- EnoughApp schema — run in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/ohiezwkqfyuidptxunmo/sql/new

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  user_name text,
  partner_name text,
  date_of_birth text not null default '1990-06-15',
  user_age numeric not null default 35,
  filing_status text not null default 'single',
  state_of_residence text not null default 'CA',
  planning_mode text not null default 'solo' check (planning_mode in ('solo', 'partner')),
  annual_income numeric not null default 95000,
  partner_annual_income numeric not null default 0,
  partner_base_annual_salary numeric,
  partner_annual_bonus numeric not null default 0,
  partner_annual_commission numeric not null default 0,
  partner_age numeric not null default 0,
  partner_date_of_birth text,
  onboarding_completed boolean not null default false,
  income_entry_mode text check (income_entry_mode is null or income_entry_mode in ('salary', 'hourly')),
  base_annual_salary numeric,
  hourly_wage numeric,
  average_weekly_hours numeric,
  annual_bonus numeric not null default 0,
  annual_commission numeric not null default 0,
  expenses_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Retirement planner inputs (Freedom tab)
-- ---------------------------------------------------------------------------
create table if not exists public.retirement_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_age numeric not null default 35,
  retirement_age numeric not null default 65,
  desired_annual_gross_income numeric not null default 120000,
  social_security_estimate numeric not null default 32000,
  pension_estimate numeric not null default 0,
  part_time_retirement_income numeric not null default 15000,
  traditional_balance numeric not null default 85000,
  roth_balance numeric not null default 42000,
  monthly_contributions numeric not null default 500,
  expected_annual_return numeric not null default 7,
  inflation_assumption numeric not null default 3,
  estimated_retirement_tax_rate numeric not null default 22,
  accounts_snapshot jsonb not null default '[]'::jsonb,
  retirement_extras jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Core bucket overrides (emergency, slush) — full BucketItem JSON
-- ---------------------------------------------------------------------------
create table if not exists public.core_buckets (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket_id text not null check (bucket_id in ('emergency', 'slush')),
  bucket jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, bucket_id)
);

-- ---------------------------------------------------------------------------
-- Custom buckets — full BucketItem JSON per row
-- ---------------------------------------------------------------------------
create table if not exists public.custom_buckets (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket_id text not null,
  bucket jsonb not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, bucket_id)
);

-- ---------------------------------------------------------------------------
-- Excess include toggles (Freedom → My Excess)
-- ---------------------------------------------------------------------------
create table if not exists public.excess_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket_id text not null,
  included boolean not null default true,
  primary key (user_id, bucket_id)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists retirement_plans_updated_at on public.retirement_plans;
create trigger retirement_plans_updated_at
before update on public.retirement_plans
for each row execute function public.set_updated_at();

drop trigger if exists core_buckets_updated_at on public.core_buckets;
create trigger core_buckets_updated_at
before update on public.core_buckets
for each row execute function public.set_updated_at();

drop trigger if exists custom_buckets_updated_at on public.custom_buckets;
create trigger custom_buckets_updated_at
before update on public.custom_buckets
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed row on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, onboarding_completed)
  values (new.id, false);
  insert into public.retirement_plans (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.retirement_plans enable row level security;
alter table public.core_buckets enable row level security;
alter table public.custom_buckets enable row level security;
alter table public.excess_preferences enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "retirement_select_own" on public.retirement_plans;
create policy "retirement_select_own" on public.retirement_plans for select using (auth.uid() = user_id);
drop policy if exists "retirement_insert_own" on public.retirement_plans;
create policy "retirement_insert_own" on public.retirement_plans for insert with check (auth.uid() = user_id);
drop policy if exists "retirement_update_own" on public.retirement_plans;
create policy "retirement_update_own" on public.retirement_plans
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "core_buckets_select_own" on public.core_buckets;
create policy "core_buckets_select_own" on public.core_buckets for select using (auth.uid() = user_id);
drop policy if exists "core_buckets_insert_own" on public.core_buckets;
create policy "core_buckets_insert_own" on public.core_buckets for insert with check (auth.uid() = user_id);
drop policy if exists "core_buckets_update_own" on public.core_buckets;
create policy "core_buckets_update_own" on public.core_buckets for update using (auth.uid() = user_id);
drop policy if exists "core_buckets_delete_own" on public.core_buckets;
create policy "core_buckets_delete_own" on public.core_buckets for delete using (auth.uid() = user_id);

drop policy if exists "custom_buckets_select_own" on public.custom_buckets;
create policy "custom_buckets_select_own" on public.custom_buckets for select using (auth.uid() = user_id);
drop policy if exists "custom_buckets_insert_own" on public.custom_buckets;
create policy "custom_buckets_insert_own" on public.custom_buckets for insert with check (auth.uid() = user_id);
drop policy if exists "custom_buckets_update_own" on public.custom_buckets;
create policy "custom_buckets_update_own" on public.custom_buckets for update using (auth.uid() = user_id);
drop policy if exists "custom_buckets_delete_own" on public.custom_buckets;
create policy "custom_buckets_delete_own" on public.custom_buckets for delete using (auth.uid() = user_id);

drop policy if exists "excess_select_own" on public.excess_preferences;
create policy "excess_select_own" on public.excess_preferences for select using (auth.uid() = user_id);
drop policy if exists "excess_insert_own" on public.excess_preferences;
create policy "excess_insert_own" on public.excess_preferences for insert with check (auth.uid() = user_id);
drop policy if exists "excess_update_own" on public.excess_preferences;
create policy "excess_update_own" on public.excess_preferences for update using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant all on public.profiles to authenticated;
grant all on public.retirement_plans to authenticated;
grant all on public.core_buckets to authenticated;
grant all on public.custom_buckets to authenticated;
grant all on public.excess_preferences to authenticated;

-- Existing projects: add retirement profile extras (run once in SQL Editor if the column is missing)
-- alter table public.retirement_plans
--   add column if not exists retirement_extras jsonb not null default '{}'::jsonb;

-- Existing projects: partner date of birth (run once if the column is missing)
-- alter table public.profiles add column if not exists partner_date_of_birth text;

-- Retirement tax location (state + filing status in retirement) is stored in retirement_plans.retirement_extras:
--   retirementStateOfResidence, retirementFilingStatus

notify pgrst, 'reload schema';
