-- Run in Supabase Dashboard → SQL Editor to verify the Expo connection.
-- https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.instruments (
  id bigint primary key generated always as identity,
  name text not null
);

insert into public.instruments (name)
values
  ('violin'),
  ('viola'),
  ('cello');

grant select on public.instruments to anon, authenticated;

alter table public.instruments enable row level security;

drop policy if exists "public can read instruments" on public.instruments;

create policy "public can read instruments"
on public.instruments
for select
to anon, authenticated
using (true);
