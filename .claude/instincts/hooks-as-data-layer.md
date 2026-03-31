---
id: verecto-hooks-as-data-layer
trigger: "when adding state management or data fetching"
confidence: 0.9
domain: frontend
source: local-repo-analysis
---

# Use Custom Hooks as the Data Layer

## Action
Create or extend hooks in `hooks/` for all data operations. Each hook owns its state (`useState`), fetching (`useEffect` + `useCallback`), and mutation functions. No global state library. Pattern:
- Export a typed interface for the row (e.g., `BookRow`, `ProfileRow`)
- Return `{ data, loading, fetchFn, mutateFn }` from the hook
- Auto-save on blur for form fields, not submit buttons

## Evidence
- 3 hooks (`useBooks`, `useDiscussion`, `useProfile`) follow this exact pattern
- All pages consume hooks directly — no context providers for data
