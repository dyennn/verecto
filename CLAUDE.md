# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Verecto** is an AI-powered reading companion web app. Tagline: "Both sides of every story." Users log books, track reading progress, generate AI discussion guides, join book clubs, and share discussions.

## Commands

All commands run from `apps/web/`:

```bash
npm run dev          # Start dev server (Turbopack) at localhost:3000
npm run build        # Production build (also runs TypeScript type checking)
npm run lint         # ESLint
npm run test         # Run tests (Vitest)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Architecture

**Monorepo** with npm workspaces: `apps/web` (Next.js 16, App Router) and `apps/mobile` (Expo, not started).

### Routing

Two route groups under `app/`:
- `(auth)/` — login/signup pages (no sidebar)
- `(app)/` — authenticated pages with sidebar layout. Auth check in `layout.tsx` redirects to `/login` if no session.

### Data Layer

- **Supabase** for auth, database, and RLS. Two clients: `lib/supabase.ts` (browser) and `lib/supabase-server.ts` (server/API routes).
- Database schema in `supabase/migration.sql` (Phase 1) and `supabase/migration-phase2.sql` (Phase 2). Run manually in Supabase SQL Editor.
- Core tables: `profiles`, `books`, `discussions`, `book_clubs`, `book_club_members`, `book_club_discussions`. All have RLS policies scoped to `auth.uid()`.

### State Management

Custom hooks in `hooks/` are the primary data layer — no global state library:
- `useBooks` — CRUD for the user's book library, CSV import
- `useDiscussion` — fetch/generate discussions via `/api/discussion`
- `useProfile` — profile CRUD with auto-save

### AI / LLM Integration

`lib/openrouter.ts` — Dual backend: OpenRouter SDK (remote) or Ollama (local). Set `LOCAL_LLM_URL` to use Ollama; otherwise needs `OPENROUTER_API_KEY`. Free tier uses a 3-model fallback chain. `generateDiscussion()` returns a structured `DiscussionGuide` JSON (hook, themes, character_spotlight, connection_to_reader, closing_provocation). Model decisions are logged to `logs/model-decisions.log` via `lib/model-logger.ts`.

### Theme System

`lib/themes.ts` defines 5 preset themes + a custom palette generator. `generateCustomPalette(accentHex, mode)` derives a full set of CSS variables from a single accent color in light or dark mode. `ThemeProvider` persists theme name, accent color, and mode to localStorage and applies CSS variables to `:root`.

### Styling Conventions

- Tailwind CSS v4 (PostCSS plugin, no tailwind.config file)
- CSS variables for all theme colors: use `var(--primary)`, `var(--background)`, etc. — never hardcode hex values in components
- Serif font: `font-[family-name:var(--font-serif)]` for headings
- UI primitives in `components/ui/` (button, card, input, tabs, badge, toast) use `class-variance-authority`
- Utility: `cn()` from `lib/utils.ts` (clsx + tailwind-merge)

### Key Conventions

- All TypeScript, no plain JS. `async/await` throughout, no `.then()` chains.
- All Supabase calls must handle errors explicitly.
- Recharts charts use CSS variables for colors (`stroke="var(--primary)"`, etc.).
- `window.speechSynthesis` and other browser APIs must be guarded with `typeof window !== "undefined"` for SSR safety.
- Do not modify `lib/openrouter.ts`, `lib/csv-parse.ts`, `lib/model-logger.ts`, or `supabase/migration.sql` unless explicitly instructed.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon key
OPENROUTER_API_KEY            # OpenRouter (not needed if using Ollama)
LOCAL_LLM_URL                 # Optional: Ollama endpoint (e.g. http://localhost:11434/v1)
LOCAL_LLM_MODEL               # Optional: Ollama model name (default: llama3.3)
```
