-- Phase 2 Migration
-- Run in Supabase SQL Editor after migration.sql (Phase 1)

-- Profile enhancements
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists reading_goal_per_year integer default 12;

-- Book progress tracking
alter table public.books
  add column if not exists current_chapter integer,
  add column if not exists total_chapters integer;

-- Discussion spoiler-gating
alter table public.discussions
  add column if not exists progress_snapshot text,
  add column if not exists chapter_number integer,
  add column if not exists total_chapters integer;

-- Book clubs
create table if not exists public.book_clubs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  book_id uuid references public.books(id) on delete set null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique default substring(gen_random_uuid()::text, 1, 8),
  created_at timestamptz default now()
);

create table if not exists public.book_club_members (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references public.book_clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz default now(),
  unique(club_id, user_id)
);

create table if not exists public.book_club_discussions (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references public.book_clubs(id) on delete cascade not null,
  discussion_id uuid references public.discussions(id) on delete cascade not null,
  shared_by uuid references public.profiles(id) on delete cascade not null,
  note text,
  created_at timestamptz default now()
);

-- RLS for book clubs
alter table public.book_clubs enable row level security;
alter table public.book_club_members enable row level security;
alter table public.book_club_discussions enable row level security;

create policy "Members can read their clubs"
  on public.book_clubs for select
  using (
    id in (select club_id from public.book_club_members where user_id = auth.uid())
  );

create policy "Owners can manage their clubs"
  on public.book_clubs for all
  using (created_by = auth.uid());

create policy "Members can read club members"
  on public.book_club_members for select
  using (
    club_id in (select club_id from public.book_club_members where user_id = auth.uid())
  );

create policy "Users can join clubs"
  on public.book_club_members for insert
  with check (user_id = auth.uid());

create policy "Members can read club discussions"
  on public.book_club_discussions for select
  using (
    club_id in (select club_id from public.book_club_members where user_id = auth.uid())
  );

create policy "Members can share discussions"
  on public.book_club_discussions for insert
  with check (shared_by = auth.uid());
