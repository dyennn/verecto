-- Phase 3 Migration
-- Run in Supabase SQL Editor after migration-phase2.sql
-- Features: Discussion Style, Other Perspectives, Quote Capture

-- Discussion style preference on profiles
alter table public.profiles
  add column if not exists discussion_style text
    check (discussion_style in ('casual', 'academic', 'socratic'))
    default 'casual';

-- Perspective mode on discussions
alter table public.discussions
  add column if not exists perspective text
    check (perspective in ('standard', 'antagonist', 'minor_character', 'historical'))
    default 'standard';

-- Quotes / highlights table
create table if not exists public.quotes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  text text not null,
  page_number integer,
  created_at timestamptz default now()
);

alter table public.quotes enable row level security;

create policy "Users can manage their own quotes"
  on public.quotes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
