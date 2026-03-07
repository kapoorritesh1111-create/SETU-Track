# SETU TRACK — UI / UX / Frontend Audit (2026-03-07)

## 1) Repo Map

### Framework
- **Next.js 14 App Router**
- Route tree under `src/app/*`
- API handlers under `src/app/api/*`

### Styling
- Global CSS architecture:
  - `src/app/globals.css`
  - `src/styles/tokens.css`
  - `src/styles/components.css`
- Design language is CSS-token driven, but still mixed with inline styles in a number of screens.

### State / Data
- Local React state on most pages
- Profile/auth state via `src/lib/useProfile.ts`
- Supabase browser client: `src/lib/supabaseBrowser.ts`
- Server-side API auth gates: `src/lib/api/gates.ts`
- Client API wrapper with bearer token injection: `src/lib/api/client.ts`

### Shell / Layout
- Root layout: `src/app/layout.tsx`
- App shell: `src/components/layout/AppShell.tsx`
- Theme provider: `src/components/theme/ThemeProvider.tsx`

### Key product routes
- Dashboard: `src/app/dashboard/page.tsx`
- Timesheet: `src/app/timesheet/*`
- Approvals: `src/app/approvals/page.tsx`
- Projects: `src/app/projects/*`
- People: `src/app/profiles/page.tsx`
- Payroll report: `src/app/reports/payroll/page.tsx`
- Payroll runs: `src/app/reports/payroll-runs/page.tsx`
- Analytics: `src/app/analytics/page.tsx`
- Admin exports: `src/app/admin/exports/page.tsx`
- Admin settings: `src/app/admin/org-settings/page.tsx`
- Billing: `src/app/admin/billing/page.tsx`

### Shared UI components
- `src/components/ui/*`
- Reusable SETU surfaces in `src/components/setu/*`

### Domain / business logic
- `src/lib/domain/*`
- Export utilities: `src/lib/exports/*`
- Date utilities: `src/lib/date*`

### Database
- Supabase migrations under `supabase/migrations/*`

### Architectural strengths
- Clear app router structure
- Shared shell exists
- API auth gate pattern exists
- Product domain logic is beginning to separate from view logic

### Architectural risks
- Too many inline styles still exist in page components
- Some screens still mix placeholder UI with live data
- API routes can fail hard when optional analytics tables/columns drift from schema
- Multiple one-off card / pill / toolbar patterns remain instead of one canonical system
- Several tables are dense and visually inconsistent across routes

---

## 2) Per-Screenshot Review

### Screenshot: Dashboard
**Issues**
- The hero looked visually strong but live data failed, leaving the command center partially empty.
- The top header spends too much vertical space relative to the actual information density.
- The dashboard hierarchy is split between the hero and older stacked metric cards below, so the page feels like two UI systems.

**Why it matters**
- Empty executive surfaces destroy trust faster than almost any other dashboard issue.
- SaaS dashboards need immediate status confidence.
- Redundant metric presentation increases cognitive load.

**Fixes applied / recommended**
- Hardened `/api/dashboard/overview` so optional analytics sources do not take the entire endpoint down.
- Added meaningful fallback messaging inside the command center hero instead of silent dashes.
- Recommended next pass: consolidate duplicate lower metric stacks into one tighter dashboard system.

### Screenshot: My Work / Timesheet
**Issues**
- The page is usable, but the layout is still form-first rather than task-first.
- Input rows are dense and visually flat; status is too quiet relative to the editable controls.
- Day sections are large, but line actions are understated.

**Why it matters**
- Heavy timesheet pages live or die on scan speed.
- Users need to instantly distinguish editable rows, locked rows, totals, and submission state.

**Recommended fixes**
- Increase status contrast and row grouping.
- Make daily summary and action affordances more obvious.
- Add stronger locked/submitted states and inline validation messaging.

### Screenshot: Approvals
**Issues**
- This is one of the stronger screens, but card density is still slightly low.
- Search and filter controls look secondary even though they are primary workflow tools.
- Summary KPIs and approval cards feel like separate systems.

**Why it matters**
- Approvals is a decision queue; filtering and scanning must dominate.

**Recommended fixes**
- Tighten top toolbar spacing.
- Make filter state more visible.
- Add anomaly reason chips and stronger overdue flagging.

### Screenshot: Projects
**Issues**
- The original KPI strip was placeholder content and therefore misleading.
- Filters and saved views sit correctly, but the page still reads like raw CRUD rather than portfolio management.
- Table actions are numerous and visually repetitive.

**Why it matters**
- Projects should feel like a portfolio control plane, not an admin spreadsheet.

**Fixes applied / recommended**
- Replaced demo KPI values with live counts derived from actual project data.
- Recommended next pass: group project actions into a single row action menu and surface budget/utilization in the list.

### Screenshot: People
**Issues**
- The original KPI strip was placeholder content and therefore misleading.
- Directory rows are editable but visually too similar to static display rows.
- Search and filters are adequate, though still too neutral for a primary workflow screen.

**Why it matters**
- User management screens require very clear editability, role clarity, and payroll readiness cues.

**Fixes applied / recommended**
- Replaced demo KPI values with live directory-based metrics.
- Recommended next pass: separate read-only cells from editable fields more clearly and add inline save feedback.

### Screenshot: Payroll report
**Issues**
- Strong structure overall, but the page remains crowded.
- The trend card is visually weak compared to the summary and distribution cards.
- Horizontal table overflow remains noticeable.

**Why it matters**
- Payroll is the product’s most trust-sensitive screen.
- Dense financial data must still feel controlled and legible.

**Recommended fixes**
- Reduce narrative copy volume above the fold.
- Standardize status chip language across register rows and export history.
- Improve responsive behavior and allow strategic wrapping for long labels.

### Screenshot: Payroll runs
**Issues**
- KPI cards are clear, but the duplicated stacked stat rows below are visually redundant.
- The trust/audit area is helpful but still text-heavy.

**Why it matters**
- Audit screens should be clean, compressed, and high-confidence.

**Recommended fixes**
- Remove redundant stat blocks.
- Use a tighter run timeline + audit metadata pattern.

### Screenshot: Analytics
**Issues**
- The page layout is clean, but empty/zero states are visually too close to valid states.
- Budget health rows and export operations rows do not create enough visual contrast.

**Why it matters**
- Analytics without strong empty states feels broken even when technically valid.

**Recommended fixes**
- Use stronger “no data in range” empty treatments.
- Add range selector and comparison mode later.

### Screenshot: Exports
**Issues**
- This is functionally solid, but the hierarchy between receipt, period, status, and action can still be tightened.
- Status chips are better than before, but still need one canonical state model.

**Why it matters**
- Audit/export history screens must make state obvious at a glance.

**Recommended fixes**
- Keep audit receipt, diff status, paid state, and project linkage in a consistent order.
- Improve paid/unpaid visual distinction.

### Screenshot: Billing
**Issues**
- Informationally fine, but this page is clearly a placeholder.
- The CTA hierarchy is weak because almost everything is disabled or explanatory.

**Why it matters**
- Placeholder pages should still feel deliberate and roadmap-ready.

**Recommended fixes**
- Add a proper “coming later” pattern and readiness checklist layout.

---

## 3) Issue Table

| Area | Issue | Severity | Recommended Fix | Expected Impact |
|---|---|---:|---|---|
| Dashboard API | Optional analytics sources could break the full overview endpoint | High | Make non-critical queries safe/fallback | Prevent broken hero and restore trust |
| Dashboard UX | Hero and lower stats compete visually | High | Consolidate dashboard hierarchy | Faster comprehension |
| Projects | Placeholder KPI values were misleading | High | Use live counts from loaded project data | Removes false intelligence |
| People | Placeholder KPI values were misleading | High | Use live directory-derived metrics | Improves credibility |
| Shell | Sidebar/header consumed too much space | Medium | Tighten shell dimensions and brand block | More usable content area |
| Accessibility | No skip link / weak menu semantics | Medium | Add skip link and `aria-expanded` / menu semantics | Better keyboard usability |
| Exports | Status model still inconsistent across contexts | Medium | Normalize receipt / paid / diff chip language | Better financial clarity |
| Tables | Some tables still overflow heavily | Medium | Improve wrapping strategy and responsive density | Better readability |
| Billing | Placeholder page lacks strong “planned” framing | Low | Use roadmap-ready placeholder pattern | Better product coherence |

---

## 4) Overall UX Score

**6.8 / 10**

### Why
SETU TRACK is clearly beyond MVP and already has the skeleton of a serious contractor operations platform. The main drag on the score is not missing functionality; it is **inconsistent presentation, partial placeholder content, and fragile confidence in executive surfaces**. Once the dashboard, table systems, and financial states are fully normalized, the product can move into the 8+ range.

---

## 5) Design System & Component Recommendations

### Foundational tokens
- Spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32
- Radius: 12 / 16 / 20 / 24
- Card elevation: one primary card shadow + one soft shadow only
- Typography ramp:
  - 12 metadata
  - 14 body / control
  - 16 strong body
  - 20 section title
  - 28–36 page title / hero metrics

### Core components to standardize
- Buttons: primary / secondary / ghost / danger / disabled / loading
- Inputs: text / select / textarea / search / error / disabled
- Tables: dense / default / responsive collapsed
- Pills: success / warning / error / neutral / informational
- Cards: workspace card / hero card / audit card / empty state card
- Toolbars: one canonical filter/action bar
- Drawers: header / tabs / footer / action bar
- Empty states: neutral empty vs broken-state empty

### Accessibility targets
- Interactive controls at least ~40px tall
- Strong visible focus ring on all buttons, inputs, tabs, row actions
- More explicit labels on search/filter controls
- Better differentiation of disabled vs read-only vs active states

---

## 6) Code Fixes Applied

### Implemented in this pass
1. Updated logo assets from the new logo pack.
2. Hardened `src/app/api/dashboard/overview/route.ts` so optional sources no longer break the whole endpoint.
3. Hardened `src/app/api/dashboard/financial-intelligence/route.ts` with optional source fallback.
4. Improved `src/components/setu/CommandCenterHero.tsx` fallback/error handling.
5. Replaced static demo KPI strips on Projects and People with live metrics derived from real loaded data.
6. Added a skip link and improved account menu accessibility semantics.
7. Tightened shell sizing and visual spacing in `src/app/globals.css`.

### Still recommended next
- Extract remaining inline styles from page files into shared UI classes.
- Consolidate all status chips to one source of truth.
- Build canonical table density variants.

---

## 7) Performance & Accessibility Checklist

### Quick wins
- Memoize expensive row derivations where not already memoized.
- Add lazy loading or route-level `loading.tsx`/`error.tsx` for heavy routes.
- Use `next/image` for branded asset rendering where practical.
- Add virtualization later for very large people/project/payroll tables.

### Accessibility
- Added skip link.
- Added menu button `aria-expanded`.
- Recommended next:
  - label every icon-only action
  - ensure drawers trap focus
  - improve keyboard actions for clickable cards/rows
  - audit contrast on all subtle gray text and pill states

---

## 8) Prioritized Roadmap

### High (1–2 weeks)
- Consolidate dashboard into one executive system
- Normalize status chip language across payroll / exports / approvals
- Finish live KPI surfaces on every major page
- Add route-level loading / error states for key screens

### Medium (3–6 weeks)
- Remove inline style drift from page components
- Build canonical table system
- Tighten navigation IA and action prioritization on dense admin screens
- Add stronger empty states and inline validation patterns

### Low (6+ weeks)
- Microinteractions and motion polish
- Advanced analytics filters and comparisons
- Bundle analysis / route-level code splitting refinement
- Full UI documentation site for the internal design system

---

## 9) Updated Repo

This audit corresponds to the repo updated in the same delivery package.
