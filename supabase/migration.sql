-- Verecto Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Users are managed by Supabase Auth (auth.users)
-- This table extends auth.users with reading profile data

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  favorite_genres text[] default '{}',
  top_moods text[] default '{}',
  reading_streak integer default 0,
  last_read_date date,
  created_at timestamptz default now()
);

create table public.books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ol_key text,                        -- Open Library key e.g. "/works/OL82563W"
  title text not null,
  author text,
  genre text,
  cover_url text,
  synopsis text,
  status text check (status in ('want_to_read', 'reading', 'finished')) default 'want_to_read',
  mood text check (mood in ('loved_it', 'it_was_fine', 'dnf')),
  progress text,                      -- e.g. "Chapter 5 of 20"
  date_finished date,
  created_at timestamptz default now()
);

create table public.discussions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  model_used text,                    -- e.g. "meta-llama/llama-3.3-70b-instruct:free"
  content jsonb not null,             -- stores the full discussion JSON
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.discussions enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can manage their own books"
  on public.books for all using (auth.uid() = user_id);

create policy "Users can manage their own discussions"
  on public.discussions for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
