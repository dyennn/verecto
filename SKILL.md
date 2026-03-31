---
name: verecto-patterns
description: Coding patterns extracted from the Verecto reading companion repository
version: 1.0.0
source: local-git-analysis
analyzed_commits: 6
---

# Verecto Patterns

## Commit Conventions

This project uses **conventional commits** with these prefixes:
- `feat:` — New features or feature enhancements (50% of commits)
- `fix:` — Bug fixes, config corrections, integration overhauls (33%)
- `chore:` — Maintenance tasks, config files (17%)

Commit messages are descriptive and may bundle multiple related changes (e.g., `feat: fix import duplicate detection + add theme system with settings page`).

## Code Architecture

```
apps/web/
├── app/
│   ├── (app)/              # Authenticated route group (sidebar layout)
│   │   ├── layout.tsx      # Auth guard + sidebar nav
│   │   ├── dashboard/      # Home page with stats
│   │   ├── library/        # Book search + library management
│   │   ├── discussion/[bookId]/  # AI discussion viewer
│   │   ├── stats/          # Reading statistics (Recharts)
│   │   ├── clubs/          # Book clubs (list + [clubId] detail)
│   │   └── settings/       # Theme settings + profile/ subpage
│   ├── (auth)/             # Unauthenticated route group
│   │   ├── login/
│   │   └── signup/
│   ├── api/                # Next.js Route Handlers
│   │   ├── discussion/     # POST — generate AI discussion
│   │   └── share-card/     # GET — OG image card (Edge Runtime)
│   ├── layout.tsx          # Root layout (ThemeProvider, ToastProvider)
│   └── page.tsx            # Landing page
├── components/
│   ├── ThemeProvider.tsx    # Theme context + CSS variable injection
│   ├── AudioPlayer.tsx     # Web Speech API TTS player
│   ├── DiscussionGuide.tsx # Renders discussion JSON structure
│   ├── BookCard.tsx        # Book display card
│   ├── ImportModal.tsx     # Goodreads CSV import wizard
│   ├── MoodTag.tsx         # Mood selection buttons
│   └── ui/                 # Shadcn-style primitives (button, card, input, tabs, badge, toast)
├── hooks/
│   ├── useBooks.ts         # Book CRUD, import, state
│   ├── useDiscussion.ts    # Discussion fetch/generate
│   └── useProfile.ts       # Profile CRUD with auto-save
├── lib/
│   ├── themes.ts           # 5 presets + generateCustomPalette(accent, mode)
│   ├── openrouter.ts       # LLM: OpenRouter SDK + Ollama fallback
│   ├── openlibrary.ts      # Book search API
│   ├── supabase.ts         # Browser Supabase client
│   ├── supabase-server.ts  # Server Supabase client
│   ├── csv-parse.ts        # Goodreads CSV parser + dedup
│   ├── model-logger.ts     # LLM decision logging
│   ├── stats.ts            # Pure stat computation functions
│   ├── discussion-to-script.ts  # Discussion → spoken script for TTS
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
└── supabase/
    ├── migration.sql       # Phase 1 schema
    └── migration-phase2.sql # Phase 2 schema
```

## Workflows

### Adding a New Page

1. Create directory under `app/(app)/{pageName}/page.tsx` (client component with `"use client"`)
2. Add nav entry in `app/(app)/layout.tsx` → `navItems` array
3. Page auto-inherits auth guard and sidebar from the `(app)` layout

### Adding a New Feature with Database

1. Add columns/tables in a new `supabase/migration-*.sql` file
2. Update relevant hook interface (e.g., add fields to `BookRow`, `ProfileRow`, `DiscussionRow`)
3. Update the hook's `updateBook()` / `updateProfile()` accepted fields
4. Use Supabase client from `lib/supabase.ts` (browser) or `lib/supabase-server.ts` (API routes)

### Adding a New API Route

1. Create `app/api/{routeName}/route.ts`
2. Use `createServerSupabaseClient()` for auth + DB
3. Check `auth.getUser()` first — return 401 if no session
4. Verify row ownership via `.eq("user_id", user.id)` queries

### Co-Change Patterns

Files that frequently change together:
- `lib/themes.ts` ↔ `components/ThemeProvider.tsx` ↔ `app/(app)/settings/page.tsx`
- `hooks/useBooks.ts` ↔ `app/(app)/library/page.tsx` ↔ `components/ImportModal.tsx`
- `lib/openrouter.ts` ↔ `app/api/discussion/route.ts`
- `app/(app)/layout.tsx` changes with any new page addition

## Styling Patterns

- **Tailwind CSS v4** via PostCSS plugin (no tailwind.config file)
- All colors via CSS variables: `var(--primary)`, `var(--background)`, `var(--border)`, etc.
- Serif headings: `font-[family-name:var(--font-serif)]`
- Component variants via `class-variance-authority` in `components/ui/`
- Class merging: `cn()` from `lib/utils.ts` (clsx + tailwind-merge)
- Never hardcode hex colors in components — always use CSS variables

## Testing Patterns

- No test framework configured
- Type checking via `npm run build` (Next.js build includes TypeScript check)
- Manual verification through dev server (`npm run dev`)

## State & Data Patterns

- No global state library — custom hooks are the data layer
- Each hook manages its own `useState` + Supabase queries
- Auto-save pattern: `onBlur` handlers that call Supabase update directly
- Debounced validation: 500ms debounce for uniqueness checks (e.g., username)
- Optimistic UI: hooks update local state immediately after successful Supabase response

## LLM Integration Patterns

- Dual backend: OpenRouter (remote) or Ollama (local) — selected by env vars
- Free tier uses 3-model fallback chain via OpenRouter SDK
- Structured JSON output: system prompt enforces exact JSON schema
- All LLM calls logged to `logs/model-decisions.log`
- Protected files: `lib/openrouter.ts`, `lib/csv-parse.ts`, `lib/model-logger.ts` — do not modify unless explicitly instructed
