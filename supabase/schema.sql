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

-- ---------------------------------------------------------------------------
-- v2: payment methods and custom categories.
alter table public.expenses add column if not exists method text;
alter table public.expenses drop constraint if exists expenses_method_check;
alter table public.expenses add constraint expenses_method_check
  check (method is null or method in ('upi', 'card', 'cash'));

-- Categories can now be user-defined, so only bound the id's length.
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check
  check (char_length(category) between 1 and 40);

alter table public.settings add column if not exists categories jsonb not null default '[]'::jsonb;
alter table public.settings drop constraint if exists settings_categories_check;
alter table public.settings add constraint settings_categories_check
  check (jsonb_typeof(categories) = 'array' and jsonb_array_length(categories) <= 50);

alter table public.settings add column if not exists hidden_categories text[] not null default '{}';
alter table public.settings drop constraint if exists settings_hidden_categories_check;
alter table public.settings add constraint settings_hidden_categories_check
  check (cardinality(hidden_categories) <= 100);
