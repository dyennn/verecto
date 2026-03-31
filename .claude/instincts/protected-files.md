---
id: verecto-protected-files
trigger: "when modifying lib/ files"
confidence: 0.95
domain: architecture
source: local-repo-analysis
---

# Do Not Modify Protected Files

## Action
These files must not be modified unless explicitly instructed:
- `lib/openrouter.ts` — LLM integration (OpenRouter SDK + Ollama)
- `lib/csv-parse.ts` — Goodreads CSV parser
- `lib/model-logger.ts` — Model decision logging
- `supabase/migration.sql` — Phase 1 database schema

## Evidence
- Project spec explicitly marks these as protected
- Breaking changes to LLM integration or CSV parsing would affect existing functionality
