# Verecto — Both sides of every story.

An AI-powered reading companion that helps you go deeper into the books you love.

## Features

- **Reading Companion** — Log books, tag your mood, track streaks and reading goals
- **AI Discussion Generator** — Generate rich, structured literary discussion guides powered by LLMs via OpenRouter
- **Personal Taste Profile** — Build a reading profile over time with mood tracking and genre preferences

## Tech Stack

| Layer | Technology |
|---|---|
| Web frontend | Next.js 14 (App Router) |
| Mobile | React Native with Expo (coming soon) |
| Backend & DB | Supabase (auth, database, storage) |
| AI | OpenRouter API (OpenAI-compatible) |
| Book metadata | Open Library API |
| Styling | Tailwind CSS |

## Getting Started

### Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) project
- An [OpenRouter](https://openrouter.ai) API key

### Setup

1. Clone the repo and install dependencies:
   ```bash
   cd apps/web
   npm install
   ```

2. Copy the environment file and fill in your keys:
   ```bash
   cp .env.local.example .env.local
   ```
   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENROUTER_API_KEY`

3. Run the SQL migration in your Supabase SQL Editor:
   - Open `supabase/migration.sql`
   - Copy and paste into Supabase Dashboard → SQL Editor → Run

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
verecto/
├── apps/
│   ├── web/              # Next.js app
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utility libraries
│   └── mobile/           # Expo app (coming soon)
└── supabase/
    └── migration.sql     # Database schema
```
