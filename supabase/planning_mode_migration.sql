-- Planning mode + partner income — run once in SQL Editor after schema.sql
-- https://supabase.com/dashboard/project/_/sql/new

alter table public.profiles
  add column if not exists planning_mode text not null default 'solo'
  check (planning_mode in ('solo', 'partner'));

alter table public.profiles
  add column if not exists partner_annual_income numeric not null default 0;

alter table public.profiles
  add column if not exists user_age numeric not null default 35;

alter table public.profiles
  add column if not exists partner_age numeric not null default 0;

-- Backfill user_age from date_of_birth where possible (Postgres age from date)
update public.profiles
set user_age = greatest(
  0,
  least(
    120,
    extract(year from age(to_date(date_of_birth, 'YYYY-MM-DD')))::numeric
  )
)
where date_of_birth ~ '^\d{4}-\d{2}-\d{2}$';

notify pgrst, 'reload schema';
