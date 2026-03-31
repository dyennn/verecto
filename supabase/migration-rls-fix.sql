-- RLS Fix: Book Club Recursive Policies
-- The original book_club_members SELECT policy queries itself, causing infinite recursion.
-- Fix: use a security definer function that bypasses RLS to check membership.

-- Drop the recursive policies
drop policy if exists "Members can read club members" on public.book_club_members;
drop policy if exists "Members can read their clubs" on public.book_clubs;
drop policy if exists "Members can read club discussions" on public.book_club_discussions;

-- Security definer function: returns club_ids the current user belongs to.
-- Security definer means it runs as the function owner (bypasses RLS on book_club_members),
-- which breaks the recursion.
create or replace function public.get_my_club_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select club_id from public.book_club_members where user_id = auth.uid()
$$;

-- Recreate policies using the function (no recursion)
create policy "Members can read club members"
  on public.book_club_members for select
  using (club_id in (select public.get_my_club_ids()));

create policy "Members can read their clubs"
  on public.book_clubs for select
  using (id in (select public.get_my_club_ids()));

create policy "Members can read club discussions"
  on public.book_club_discussions for select
  using (club_id in (select public.get_my_club_ids()));
