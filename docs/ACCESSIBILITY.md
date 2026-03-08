# ACCESSIBILITY

This pass keeps WCAG AA as the target.

Implemented:
- login inputs keep labels and explicit associations
- focus-visible styling remains active through shared tokens
- button state contrast improved for submitted timesheet states
- mobile controls stack cleanly so text is not clipped or overlapped
- logo images use descriptive alt text through the canonical brand component

Areas to keep validating after deploy:
- keyboard traversal on long timesheet weeks
- color contrast in dark mode for all report pills and KPI cards
- reduced-motion review for any future animation additions
