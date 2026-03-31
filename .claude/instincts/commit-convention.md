---
id: verecto-commit-convention
trigger: "when writing a commit message"
confidence: 0.85
domain: git
source: local-repo-analysis
---

# Use Conventional Commits

## Action
Prefix commits with: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

Descriptive messages that explain the "what and why", not just the "what". Multiple related changes can be bundled in one commit message with `+` separator.

## Evidence
- Analyzed 6 commits
- 100% follow conventional commit format
- Examples: `feat: add Goodreads CSV import to library`, `fix: overhaul LLM integration with SDK, Ollama support, and model logging`
