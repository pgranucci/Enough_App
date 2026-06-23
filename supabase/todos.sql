-- Run this entire script in Supabase Dashboard → SQL Editor → Run
-- https://supabase.com/dashboard/project/ohiezwkqfyuidptxunmo/sql/new

create table if not exists public.todos (
  id bigint primary key generated always as identity,
  name text not null
);

insert into public.todos (name)
select v.name
from (values
  ('Learn Expo'),
  ('Connect Supabase'),
  ('Build EnoughApp')
) as v(name)
where not exists (select 1 from public.todos limit 1);

grant usage on schema public to anon, authenticated;
grant select on public.todos to anon, authenticated;

alter table public.todos enable row level security;

drop policy if exists "public can read todos" on public.todos;

create policy "public can read todos"
on public.todos
for select
to anon, authenticated
using (true);

-- Refresh PostgREST schema cache so the API sees the new table immediately
notify pgrst, 'reload schema';
