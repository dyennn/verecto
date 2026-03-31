---
id: verecto-page-creation
trigger: "when adding a new page or route"
confidence: 0.85
domain: frontend
source: local-repo-analysis
---

# Follow the Page Creation Pattern

## Action
1. Create `app/(app)/{pageName}/page.tsx` as a `"use client"` component
2. Add a nav entry to `navItems` in `app/(app)/layout.tsx` with `href`, `label`, and `icon` (from lucide-react)
3. Use the standard page layout: `mx-auto max-w-4xl space-y-8` wrapper, serif `h1` heading
4. Import data via custom hooks from `hooks/`
5. Show a loading spinner while data loads: `border-[var(--primary)] border-t-transparent animate-spin`

## Evidence
- All 6 pages (dashboard, library, stats, clubs, settings, discussion) follow this exact pattern
- Layout auto-provides auth guard and sidebar
