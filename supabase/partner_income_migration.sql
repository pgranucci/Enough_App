-- Partner income breakdown on profiles (salary + bonus + commission)
-- Run once in Supabase Dashboard → SQL Editor

alter table public.profiles
  add column if not exists partner_base_annual_salary numeric,
  add column if not exists partner_annual_bonus numeric not null default 0,
  add column if not exists partner_annual_commission numeric not null default 0;

-- Backfill salary from legacy combined partner_annual_income where split was not stored
update public.profiles
set partner_base_annual_salary = partner_annual_income
where planning_mode = 'partner'
  and partner_annual_income > 0
  and partner_base_annual_salary is null;

notify pgrst, 'reload schema';
