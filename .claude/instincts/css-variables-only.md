---
id: verecto-css-variables-only
trigger: "when writing styles or component colors"
confidence: 0.95
domain: frontend
source: local-repo-analysis
---

# Use CSS Variables for All Colors

## Action
Never hardcode hex values in components. Always use `var(--primary)`, `var(--background)`, `var(--border)`, etc. This applies to inline styles, Tailwind classes (`text-[var(--primary)]`), and Recharts props (`fill="var(--primary)"`).

## Evidence
- All 5 preset themes + custom palette system rely on CSS variable injection
- ThemeProvider dynamically sets `:root` CSS variables
- Hardcoded colors break theme switching
