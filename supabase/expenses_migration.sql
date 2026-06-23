-- Expenses / debts snapshot on profiles (run in SQL Editor if schema already exists)
-- https://supabase.com/dashboard/project/_/sql/new

alter table public.profiles
  add column if not exists expenses_snapshot jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
