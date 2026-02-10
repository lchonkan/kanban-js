-- ══════════════════════════════════════════════════
-- Kanban JS — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ══════════════════════════════════════════════════

-- 1. Profiles table — stores per-user preferences
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    theme text not null default 'dark',
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- 2. Lists table — kanban columns
create table if not exists public.lists (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users on delete cascade not null,
    title text not null,
    position integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.lists enable row level security;

create policy "Users can read own lists"
    on public.lists for select
    using (auth.uid() = user_id);

create policy "Users can insert own lists"
    on public.lists for insert
    with check (auth.uid() = user_id);

create policy "Users can update own lists"
    on public.lists for update
    using (auth.uid() = user_id);

create policy "Users can delete own lists"
    on public.lists for delete
    using (auth.uid() = user_id);

-- 3. Tasks table — individual task cards
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    list_id uuid references public.lists on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    title text not null,
    description text default '',
    completed boolean not null default false,
    position integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can read own tasks"
    on public.tasks for select
    using (auth.uid() = user_id);

create policy "Users can insert own tasks"
    on public.tasks for insert
    with check (auth.uid() = user_id);

create policy "Users can update own tasks"
    on public.tasks for update
    using (auth.uid() = user_id);

create policy "Users can delete own tasks"
    on public.tasks for delete
    using (auth.uid() = user_id);

-- 4. Seed function — creates default lists for new users
create or replace function public.seed_default_lists(user_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
    insert into public.lists (user_id, title, position) values
        (user_uuid, 'Pendientes',  0),
        (user_uuid, 'En Proceso',  1),
        (user_uuid, 'Finalizadas', 2);
end;
$$;

-- 5. Trigger — auto-create profile + seed lists on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id) values (new.id);
    perform public.seed_default_lists(new.id);
    return new;
end;
$$;

-- Drop existing trigger if re-running migration
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
