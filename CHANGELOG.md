# Changelog

## 2026-03-07 — Brand lockup + login refinement

### Added
- `src/config/brand.ts` for centralized brand constants
- `src/components/brand/BrandLockup.tsx` shared brand lockup component
- `public/brand/logo.svg` canonical SVG logo
- `public/brand/logo-mark.svg` symbol-only SVG mark
- `public/brand/logo@2x.png` PNG fallback asset

### Changed
- login page now uses the shared SVG lockup and tagline
- login page now includes footer attribution: `A product of SETU Groups LLC.`
- auth fields now use explicit labels, improved focus states, and associated status messaging
- sidebar and mobile drawer branding now use the shared brand lockup instead of mixed legacy assets

### Notes
- Assumption used for this pass: the tagline is shown with the main brand lockup on login and shell branding surfaces, while footer attribution remains login-only.
