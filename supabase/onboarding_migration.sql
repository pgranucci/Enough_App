-- Onboarding + income breakdown — run once in SQL Editor after schema.sql
-- https://supabase.com/dashboard/project/_/sql/new

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
  add column if not exists income_entry_mode text check (income_entry_mode is null or income_entry_mode in ('salary', 'hourly'));

alter table public.profiles
  add column if not exists base_annual_salary numeric;

alter table public.profiles
  add column if not exists hourly_wage numeric;

alter table public.profiles
  add column if not exists average_weekly_hours numeric;

alter table public.profiles
  add column if not exists annual_bonus numeric not null default 0;

alter table public.profiles
  add column if not exists annual_commission numeric not null default 0;

-- Legacy rows (already using the app): skip onboarding once
update public.profiles set onboarding_completed = true;

-- New signups default to onboarding required
alter table public.profiles alter column onboarding_completed set default false;

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

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Upserts merge INSERT + UPDATE; explicit WITH CHECK avoids UPDATE-side RLS issues.
-- Safe to re-run (drops/recreates policies).
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "retirement_update_own" on public.retirement_plans;
create policy "retirement_update_own" on public.retirement_plans
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
