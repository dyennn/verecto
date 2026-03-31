-- Phase 4: Discussion Reactions + Book Recommendations

-- ============================================================
-- discussion_reactions
-- ============================================================

create table if not exists discussion_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  discussion_id uuid references book_club_discussions(id) on delete cascade not null,
  emoji text not null check (emoji in ('💡','❤️','🔥','👍','👎')),
  created_at timestamptz default now() not null,
  unique (user_id, discussion_id, emoji)
);

alter table discussion_reactions enable row level security;

create policy "Users manage own reactions"
  on discussion_reactions for all using (auth.uid() = user_id);

create policy "Anyone can read reactions"
  on discussion_reactions for select using (true);

-- ============================================================
-- recommendations
-- ============================================================

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  recommended_books jsonb not null,
  created_at timestamptz default now() not null,
  unique (user_id, book_id)
);

alter table recommendations enable row level security;

create policy "Users manage own recommendations"
  on recommendations for all using (auth.uid() = user_id);
