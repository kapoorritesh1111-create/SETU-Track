# SETU TRACK — Repair Release Notes (2026-03-07)

## Scope completed
This pass focused on product repair and maturation rather than new feature expansion.

Completed areas:
- shell branding cleanup
- larger dashboard redesign
- payroll report cleanup
- analytics workspace retention + polish
- exports paid-state clarity
- payroll runs paid-state clarity
- billing workspace redesign for future Stripe integration
- responsive and dark-mode polish
- updated release documentation

## Main issues corrected

### 1. Sidebar / shell brand drift
The sidebar previously combined a symbol treatment, repeated product naming patterns, and an org fallback that could read like duplicate product labeling.

Fix applied:
- use the approved horizontal SETU TRACK wordmark in the sidebar and drawer
- use symbol-only treatment only where space is constrained
- change the org badge fallback from `SETU TRACK` to `Workspace`

### 2. Dashboard hierarchy
The dashboard was functionally rich but visually heavy. Critical controls and status indicators were competing with narrative panels and repeated action surfaces.

Fix applied:
- moved period and lock controls into the top hero
- simplified dashboard copy
- split operational focus into actions + checklist instead of one long stack
- preserved budget and profile readiness as supporting panels

### 3. Payroll reporting readability
The payroll report contained too much explanatory copy and inconsistent control tone.

Fix applied:
- shortened copy
- simplified filter labels
- renamed segmented views to shorter labels
- kept the summary/register workflow intact

### 4. Billing alignment
Billing looked like a placeholder surface and did not visually match the maturity of the rest of the product.

Fix applied:
- widened the page layout
- kept Stripe-readiness positioning
- reinforced invoice/export routing and subscription-readiness content

## Architecture notes
- baseline app routes remain under `src/app`
- theme application is handled through `ThemeProvider`
- UI state for reporting pages stays in the route components
- shell consistency is centralized in `AppShell` and `globals.css`

## Validation notes
- this repo was updated as a source-level repair pass
- due to environment limitations, full dependency-backed `next build` validation was not completed in-container
- source files were reviewed and updated with deployment-ready intent, but build verification should still be run locally or in CI:

```bash
npm install
npm run build
```

## Suggested next steps
1. run a real build + deploy verification on Vercel
2. verify dark mode on all admin pages
3. verify paid/unpaid status propagation after live payroll run updates
4. complete a second-pass cleanup of People and Projects page density if needed
