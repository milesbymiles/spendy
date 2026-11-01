-- spendy database setup. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

-- Expenses. Deletes are soft (deleted = true) so other devices learn about them on their next sync.
create table if not exists public.expenses (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 64),
  amount     bigint not null check (amount > 0),            -- paise
  category   text not null check (category in (
               'food', 'groceries', 'transport', 'shopping', 'bills',
               'fun', 'health', 'travel', 'home', 'other')),
  note       text not null default '' check (char_length(note) <= 200),
  date       date not null,
  created_at bigint not null,                               -- client time, ms since epoch
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),            -- server time; drives incremental sync
  primary key (user_id, id)
);

create index if not exists expenses_user_updated on public.expenses (user_id, updated_at);

-- One row per user for app settings.
create table if not exists public.settings (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  budget     bigint check (budget is null or budget > 0),   -- paise
  updated_at timestamptz not null default now()
);

-- Always stamp updated_at with the server clock, whatever the client sends.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before insert or update on public.expenses
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before insert or update on public.settings
  for each row execute function public.touch_updated_at();

-- Row Level Security: every signed-in user can only ever see and change their own rows.
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.expenses, public.settings from anon;
grant select, insert, update, delete on public.expenses, public.settings to authenticated;
