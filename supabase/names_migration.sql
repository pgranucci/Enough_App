-- Add display names for user and partner (run in Supabase SQL Editor)
alter table public.profiles
  add column if not exists user_name text,
  add column if not exists partner_name text;
