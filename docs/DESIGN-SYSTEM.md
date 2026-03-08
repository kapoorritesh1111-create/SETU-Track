# DESIGN SYSTEM

Tokens remain the source of truth:
- `src/styles/tokens.css`
- `src/styles/components.css`
- `src/app/globals.css`

Shared components added/retained:
- `PageHeader`
- `StatCard`
- `FilterToolbar`
- `EmptyState`
- `SectionCard`
- `StatusBadge`
- `DataTableShell`
- `BrandLockup`

Core principles used in this pass:
- single spacing rhythm across page headers, cards, and toolbars
- rounded controls and cards driven by tokenized radius values
- high-contrast primary actions, calm secondary actions
- mobile layouts stack by intent, not by desktop grid shrink
- status must always be readable in all states, especially disabled/submitted states
