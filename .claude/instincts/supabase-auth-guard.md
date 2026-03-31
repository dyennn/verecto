---
id: verecto-supabase-auth-guard
trigger: "when creating API routes or server-side data access"
confidence: 0.9
domain: backend
source: local-repo-analysis
---

# Always Auth-Guard API Routes

## Action
Every API route must:
1. Call `createServerSupabaseClient()` from `lib/supabase-server.ts`
2. Check `await supabase.auth.getUser()` — return 401 if no user
3. Scope all queries with `.eq("user_id", user.id)` to enforce RLS

Client-side pages in `(app)/` route group are protected by the layout's auth redirect.

## Evidence
- All existing API routes follow this pattern (`app/api/discussion/route.ts`, `app/api/share-card/route.tsx`)
- RLS policies on all tables scope to `auth.uid()`
